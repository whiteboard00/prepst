#!/usr/bin/env python3
"""
Quick analytics monitoring script
Run this to check the health of your learning analytics system
"""

import os
import sys
from supabase import create_client, Client
from tabulate import tabulate
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def check_mastery_tracking():
    """Check user skill mastery data"""
    print("\n" + "="*80)
    print("📊 USER SKILL MASTERY TRACKING")
    print("="*80)
    
    result = supabase.table('user_skill_mastery').select(
        'user_id, skill_id, mastery_probability, total_attempts, correct_attempts, learning_velocity, plateau_flag'
    ).limit(10).execute()
    
    if result.data:
        print(f"\n✅ Found {len(result.data)} mastery records")
        print("\nSample records:")
        print(tabulate(result.data, headers='keys', tablefmt='grid'))
    else:
        print("\n⚠️  No mastery records found - users need to answer questions first")


def check_confidence_timing():
    """Check confidence score and timing data"""
    print("\n" + "="*80)
    print("⏱️  CONFIDENCE & TIMING DATA")
    print("="*80)
    
    # Count records with confidence scores
    result = supabase.rpc('check_confidence_timing', {}).execute()
    
    # Alternative: Direct query
    result = supabase.table('session_questions').select(
        'confidence_score, time_spent_seconds'
    ).not_.is_('confidence_score', 'null').limit(100).execute()
    
    if result.data:
        scores = [r['confidence_score'] for r in result.data if r['confidence_score']]
        times = [r['time_spent_seconds'] for r in result.data if r['time_spent_seconds']]
        
        print(f"\n✅ Found {len(scores)} questions with confidence scores")
        if scores:
            print(f"   Average confidence: {sum(scores)/len(scores):.2f}")
            print(f"   Min/Max: {min(scores)} - {max(scores)}")
        
        if times:
            print(f"\n✅ Found {len(times)} questions with timing data")
            print(f"   Average time: {sum(times)/len(times):.1f} seconds")
            print(f"   Min/Max: {min(times)} - {max(times)} seconds")
    else:
        print("\n⚠️  No confidence/timing data found - feature may not be active yet")


def check_learning_events():
    """Check learning events log"""
    print("\n" + "="*80)
    print("📝 LEARNING EVENTS LOG")
    print("="*80)
    
    result = supabase.table('learning_events').select('event_type').execute()
    
    if result.data:
        event_counts = {}
        for event in result.data:
            event_type = event['event_type']
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        print(f"\n✅ Found {len(result.data)} learning events")
        print("\nEvent type breakdown:")
        for event_type, count in sorted(event_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"   {event_type}: {count}")
    else:
        print("\n⚠️  No learning events found - BKT updates may not be running")


def check_performance_snapshots():
    """Check performance snapshots"""
    print("\n" + "="*80)
    print("📸 PERFORMANCE SNAPSHOTS")
    print("="*80)
    
    result = supabase.table('user_performance_snapshots').select(
        'snapshot_type, predicted_sat_math, predicted_sat_rw, avg_mastery, created_at'
    ).order('created_at', desc=True).limit(10).execute()
    
    if result.data:
        print(f"\n✅ Found {len(result.data)} performance snapshots")
        print("\nRecent snapshots:")
        print(tabulate(result.data, headers='keys', tablefmt='grid'))
    else:
        print("\n⚠️  No performance snapshots found - sessions may not be completing")


def check_user_progress():
    """Check overall user progress"""
    print("\n" + "="*80)
    print("📈 USER PROGRESS SUMMARY")
    print("="*80)
    
    # Get unique users with mastery data
    result = supabase.table('user_skill_mastery').select('user_id').execute()
    
    if result.data:
        user_ids = list(set(r['user_id'] for r in result.data))
        print(f"\n✅ {len(user_ids)} users have learning data")
        
        # Get mastery stats per user
        for user_id in user_ids[:5]:  # Show first 5 users
            user_mastery = supabase.table('user_skill_mastery').select(
                'mastery_probability, total_attempts, correct_attempts'
            ).eq('user_id', user_id).execute()
            
            if user_mastery.data:
                avg_mastery = sum(r['mastery_probability'] for r in user_mastery.data) / len(user_mastery.data)
                total_attempts = sum(r['total_attempts'] for r in user_mastery.data)
                total_correct = sum(r['correct_attempts'] for r in user_mastery.data)
                accuracy = (total_correct / total_attempts * 100) if total_attempts > 0 else 0
                
                print(f"\n   User: {user_id[:8]}...")
                print(f"   Skills tracked: {len(user_mastery.data)}")
                print(f"   Avg mastery: {avg_mastery:.2f}")
                print(f"   Overall accuracy: {accuracy:.1f}%")
    else:
        print("\n⚠️  No user progress data found")


def check_question_difficulty():
    """Check question difficulty parameters"""
    print("\n" + "="*80)
    print("🎯 QUESTION DIFFICULTY CALIBRATION (IRT)")
    print("="*80)
    
    result = supabase.table('question_difficulty_params').select(
        'question_id, difficulty, discrimination, guessing_param'
    ).limit(10).execute()
    
    if result.data:
        print(f"\n✅ Found {len(result.data)} calibrated questions")
        print("\nSample difficulty parameters:")
        print(tabulate(result.data, headers='keys', tablefmt='grid'))
    else:
        print("\n⚠️  No question difficulty parameters found")
        print("   IRT calibration will happen automatically as users answer questions")


def main():
    print("\n" + "="*80)
    print("🧠 LEARNING ANALYTICS SYSTEM - HEALTH CHECK")
    print("="*80)
    
    try:
        check_mastery_tracking()
        check_confidence_timing()
        check_learning_events()
        check_performance_snapshots()
        check_user_progress()
        check_question_difficulty()
        
        print("\n" + "="*80)
        print("✅ Health check complete!")
        print("="*80)
        print("\nTo see more detailed queries, check:")
        print("   backend/supabase/monitoring_queries.sql")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error during health check: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()

