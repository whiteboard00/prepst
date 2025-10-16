"""
Question Bank Import Script
Imports questions from question_bank.json into the database

Usage:
    # Test with 10 questions
    python scripts/import_questions.py --test

    # Import all questions
    python scripts/import_questions.py --full

    # Import specific number
    python scripts/import_questions.py --limit 100
"""

import json
import sys
import os
import uuid
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv
import argparse

# Add parent directory to path to import topic_mapping
sys.path.insert(0, str(Path(__file__).parent))
from topic_mapping import get_topic_id

# Load environment variables
load_dotenv('.env.local')

# Initialize Supabase client with service role key (bypasses RLS)
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
)


def transform_question(q_id: str, q_data: dict) -> dict:
    """
    Transform a question from JSON format to database format.

    Args:
        q_id: Question ID from JSON (the key)
        q_data: Question data from JSON (the value)

    Returns:
        Dictionary ready for database insertion
    """
    content = q_data.get('content', {})
    skill_desc = q_data.get('skill_desc', '').strip()  # Remove trailing/leading spaces

    # Get topic_id from mapping
    topic_id = get_topic_id(skill_desc)

    # Handle different content structures (stem vs prompt)
    acceptable_answers = None  # Will be populated differently based on format

    if 'stem' in content:
        # Format 1: Manifold/Proteus format
        stem = content['stem']
        answer_options = content.get('answerOptions')
        if answer_options and isinstance(answer_options, list) and len(answer_options) == 0:
            answer_options = None  # Empty array -> None
        correct = content.get('correct_answer', [])
        acceptable_answers = content.get('keys')  # UUIDs already present
    else:
        # Format 2: IBN format with 'prompt' and nested 'answer'
        stem = content.get('prompt', '')
        answer_obj = content.get('answer', {})
        choices = answer_obj.get('choices', {})

        # Convert choices dict to list format with generated UUIDs
        if choices:
            # Generate UUIDs for each choice and create list format
            choice_to_uuid = {}
            answer_options = []

            # Sort keys to ensure consistent order (a, b, c, d)
            for key in sorted(choices.keys()):
                option_uuid = str(uuid.uuid4())
                choice_to_uuid[key.lower()] = option_uuid
                answer_options.append({
                    'id': option_uuid,
                    'content': choices[key].get('body', '')
                })

            # Map correct_choice letter to UUID for acceptable_answers
            correct_choice = answer_obj.get('correct_choice')
            if correct_choice:
                correct_letter_lower = correct_choice.lower()
                correct_letter_upper = correct_choice.upper()
                correct = [correct_letter_upper]  # Uppercase for consistency

                # Map to UUID
                if correct_letter_lower in choice_to_uuid:
                    acceptable_answers = [choice_to_uuid[correct_letter_lower]]
            else:
                correct = []
        else:
            answer_options = None
            correct_choice = answer_obj.get('correct_choice')
            correct = [correct_choice] if correct_choice else []

    # Determine question type (infer if not present)
    question_type = content.get('type')
    if not question_type:
        # If no options, it's student-produced response (spr)
        # If has options, it's multiple choice (mc)
        question_type = 'mc' if answer_options else 'spr'

    # Normalize type values (JSON uses 'mcq', database uses 'mc')
    if question_type == 'mcq':
        question_type = 'mc'

    # Extract stimulus (passage/context for English questions)
    # Only present in English questions, NULL for math questions
    stimulus = content.get('stimulus')

    # Build question record
    question = {
        'external_id': q_data.get('questionId'),
        'source_uid': q_data.get('uId'),
        'topic_id': topic_id,
        'difficulty': q_data.get('difficulty'),
        'difficulty_score': q_data.get('score_band_range_cd'),
        'module': q_data.get('module'),
        'question_type': question_type,
        'stimulus': stimulus,
        'stem': stem,
        'answer_options': answer_options,
        'correct_answer': correct,
        'acceptable_answers': acceptable_answers,  # Now properly set for both formats
        'rationale': content.get('rationale') or content.get('answer', {}).get('rationale'),
        'is_active': True
    }

    return question


def import_questions(limit=None, dry_run=False):
    """
    Import questions from JSON file into database.

    Args:
        limit: Maximum number of questions to import (None = all)
        dry_run: If True, don't actually insert, just validate
    """
    # Get existing external IDs to skip duplicates
    print("📋 Checking for existing questions...")
    existing_ids = set()
    try:
        result = supabase.table('questions').select('external_id').execute()
        existing_ids = {q['external_id'] for q in result.data if q['external_id']}
        print(f"   Found {len(existing_ids)} existing questions")
    except Exception as e:
        print(f"   Warning: Could not fetch existing questions: {e}")

    # Load question bank
    json_path = Path(__file__).parent.parent / 'question_bank.json'

    print(f"📂 Loading questions from: {json_path}")
    with open(json_path) as f:
        data = json.load(f)

    total_questions = len(data)
    print(f"📊 Total questions in file: {total_questions}")

    if limit:
        print(f"🔢 Limiting to first {limit} questions")

    # Process questions
    questions = []
    skipped = []
    processed = 0
    skipped_existing = 0

    for q_id, q_data in data.items():
        if limit and processed >= limit:
            break

        processed += 1

        try:
            transformed = transform_question(q_id, q_data)

            # Skip if already exists
            if transformed['external_id'] in existing_ids:
                skipped_existing += 1
                continue

            # Validate required fields
            if not transformed['topic_id']:
                skipped.append({
                    'id': q_id,
                    'skill': q_data.get('skill_desc'),
                    'reason': 'No topic mapping found'
                })
                continue

            if not transformed['stem']:
                skipped.append({
                    'id': q_id,
                    'skill': q_data.get('skill_desc'),
                    'reason': 'No question stem'
                })
                continue

            questions.append(transformed)

        except Exception as e:
            skipped.append({
                'id': q_id,
                'error': str(e)
            })

    print(f"\n✅ Transformed: {len(questions)} questions")
    print(f"⏭️  Skipped existing: {skipped_existing} questions")
    print(f"⚠️  Skipped invalid: {len(skipped)} questions")

    if skipped:
        print("\n⚠️  Skipped questions:")
        for s in skipped[:5]:  # Show first 5
            print(f"  - {s}")
        if len(skipped) > 5:
            print(f"  ... and {len(skipped) - 5} more")

    # Dry run - just show what would be imported
    if dry_run:
        print("\n🔍 DRY RUN - Not inserting into database")
        print(f"\nSample question:")
        if questions:
            sample = questions[0]
            print(f"  External ID: {sample['external_id']}")
            print(f"  Topic ID: {sample['topic_id']}")
            print(f"  Difficulty: {sample['difficulty']}")
            print(f"  Type: {sample['question_type']}")
            print(f"  Stem: {sample['stem'][:100]}...")
        return

    # Insert into database
    if not questions:
        print("\n❌ No questions to import!")
        return

    print(f"\n💾 Inserting {len(questions)} questions into database...")

    try:
        # Insert in batches of 50 to avoid timeout and connection issues
        batch_size = 50
        inserted_count = 0

        for i in range(0, len(questions), batch_size):
            batch = questions[i:i + batch_size]

            # Retry logic for network errors
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    result = supabase.table('questions').insert(batch).execute()
                    inserted_count += len(batch)
                    print(f"  ✅ Inserted batch {i // batch_size + 1}: {len(batch)} questions (Total: {inserted_count})")
                    break
                except Exception as e:
                    if attempt < max_retries - 1:
                        print(f"  ⚠️  Retry {attempt + 1}/{max_retries} for batch {i // batch_size + 1}")
                        import time
                        time.sleep(2)  # Wait 2 seconds before retry
                    else:
                        raise

        print(f"\n🎉 SUCCESS! Imported {inserted_count} questions")

        # Show summary statistics
        print("\n📊 Import Summary:")
        by_module = {}
        by_difficulty = {}

        for q in questions:
            module = q['module']
            difficulty = q['difficulty']
            by_module[module] = by_module.get(module, 0) + 1
            by_difficulty[difficulty] = by_difficulty.get(difficulty, 0) + 1

        print(f"\n  By Module:")
        for module, count in sorted(by_module.items()):
            print(f"    {module}: {count}")

        print(f"\n  By Difficulty:")
        for diff, count in sorted(by_difficulty.items()):
            print(f"    {diff}: {count}")

    except Exception as e:
        print(f"\n❌ ERROR during import: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(description='Import questions from JSON to database')
    parser.add_argument('--test', action='store_true', help='Test mode: import only 10 questions')
    parser.add_argument('--full', action='store_true', help='Import all questions')
    parser.add_argument('--limit', type=int, help='Import specific number of questions')
    parser.add_argument('--dry-run', action='store_true', help='Validate only, don\'t insert')

    args = parser.parse_args()

    # Determine limit
    limit = None
    if args.test:
        limit = 10
        print("🧪 TEST MODE: Importing 10 questions\n")
    elif args.limit:
        limit = args.limit
        print(f"🔢 LIMIT MODE: Importing {limit} questions\n")
    elif args.full:
        print("🚀 FULL IMPORT: Importing all questions\n")
    else:
        # Default to test mode
        limit = 10
        print("🧪 DEFAULT TEST MODE: Importing 10 questions")
        print("   Use --full to import all, or --limit N for specific number\n")

    # Run import
    import_questions(limit=limit, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
