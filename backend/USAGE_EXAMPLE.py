"""
Example Usage of the SAT Prep Adaptive Learning Algorithm

This script demonstrates the complete workflow of the adaptive learning system.
"""

import requests
from datetime import datetime, timedelta
import json

# Base API URL
BASE_URL = "http://localhost:8000/api/v1"


def example_complete_workflow():
    """
    Demonstrates a complete user workflow:
    1. Create user profile
    2. Get next topic recommendation
    3. Create study session
    4. Answer questions
    5. Complete session
    6. Check progress
    """
    
    print("=" * 80)
    print("SAT PREP ADAPTIVE LEARNING - EXAMPLE WORKFLOW")
    print("=" * 80)
    
    # ========================================================================
    # STEP 1: Create User Profile
    # ========================================================================
    print("\n1. Creating user profile...")
    
    user_data = {
        "user_id": "demo_user_001",
        "past_math_score": 650,
        "past_english_score": 680,
        "target_math_score": 750,
        "target_english_score": 750,
        "test_date": (datetime.now() + timedelta(days=90)).isoformat()
    }
    
    response = requests.post(f"{BASE_URL}/users", json=user_data)
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        profile = response.json()
        print(f"   ✓ User created: {profile['user_id']}")
        print(f"   ✓ Math mastery initialized: {len([t for t in profile['topic_masteries'].keys() if 'Linear' in t or 'Nonlinear' in t or 'equation' in t])} math topics")
    else:
        print(f"   ✗ Error: {response.json()}")
        return
    
    # ========================================================================
    # STEP 2: Get Next Topic Recommendation
    # ========================================================================
    print("\n2. Getting next topic recommendation...")
    
    rec_data = {
        "user_id": "demo_user_001",
        "module": "math"
    }
    
    response = requests.post(f"{BASE_URL}/recommendations/next", json=rec_data)
    
    if response.status_code == 200:
        recommendation = response.json()
        topic = recommendation["topic"]
        print(f"   ✓ Recommended topic: {topic}")
        print(f"   ✓ Current mastery: {recommendation['current_mastery']:.3f}")
        print(f"   ✓ Priority score: {recommendation['priority_score']:.3f}")
        print(f"   ✓ Reason: {recommendation['reason']}")
    else:
        print(f"   ✗ Error: {response.json()}")
        return
    
    # ========================================================================
    # STEP 3: Create Study Session
    # ========================================================================
    print("\n3. Creating study session...")
    
    session_data = {
        "user_id": "demo_user_001",
        "topic": topic,
        "num_questions": 5  # Just 5 for demo
    }
    
    response = requests.post(f"{BASE_URL}/sessions", json=session_data)
    
    if response.status_code == 200:
        session = response.json()
        session_id = session["session_id"]
        questions = session["questions"]
        print(f"   ✓ Session created: {session_id}")
        print(f"   ✓ Questions assigned: {len(questions)}")
    else:
        print(f"   ✗ Error: {response.json()}")
        return
    
    # ========================================================================
    # STEP 4: Simulate Answering Questions
    # ========================================================================
    print("\n4. Answering questions...")
    
    # Simulate different answer scenarios
    simulated_answers = [
        {
            "is_correct": True,
            "difficulty": "E",
            "time_taken": 55,
            "expected_time": 60,
            "confidence": "apple"  # Correct and confident - good!
        },
        {
            "is_correct": False,
            "difficulty": "M",
            "time_taken": 105,
            "expected_time": 90,
            "confidence": "apple"  # Wrong but confident - critical gap!
        },
        {
            "is_correct": True,
            "difficulty": "M",
            "time_taken": 88,
            "expected_time": 90,
            "confidence": "broccoli"  # Correct but unsure - good sign
        },
        {
            "is_correct": False,
            "difficulty": "H",
            "time_taken": 130,
            "expected_time": 120,
            "confidence": "ice_cube"  # Wrong guess - no penalty
        },
        {
            "is_correct": True,
            "difficulty": "H",
            "time_taken": 115,
            "expected_time": 120,
            "confidence": "lemon"  # Correct hard question
        }
    ]
    
    performances = []
    
    for i, answer_sim in enumerate(simulated_answers):
        if i < len(questions):
            answer_data = {
                "question_id": questions[i],
                "topic": topic,
                "user_id": "demo_user_001",
                **answer_sim
            }
            
            response = requests.post(
                f"{BASE_URL}/sessions/{session_id}/answers",
                json=answer_data
            )
            
            if response.status_code == 200:
                perf = response.json()
                performances.append(perf)
                result = "✓ Correct" if answer_sim["is_correct"] else "✗ Wrong"
                print(f"   Q{i+1}: {result} | "
                      f"Difficulty: {answer_sim['difficulty']} | "
                      f"Confidence: {answer_sim['confidence']} | "
                      f"Score: {perf['performance_score']:.3f}")
            else:
                print(f"   ✗ Error on Q{i+1}: {response.json()}")
    
    # ========================================================================
    # STEP 5: Complete Session
    # ========================================================================
    print("\n5. Completing session...")
    
    response = requests.post(f"{BASE_URL}/sessions/{session_id}/complete")
    
    if response.status_code == 200:
        stats = response.json()
        print(f"   ✓ Session completed!")
        print(f"   ✓ Correct: {stats['correct_answers']}/{stats['total_questions']}")
        print(f"   ✓ Mastery before: {stats['mastery_before']:.3f}")
        print(f"   ✓ Mastery after: {stats['mastery_after']:.3f}")
        print(f"   ✓ Improvement: {stats['improvement']:+.3f}")
    else:
        print(f"   ✗ Error: {response.json()}")
        return
    
    # ========================================================================
    # STEP 6: Check Overall Progress
    # ========================================================================
    print("\n6. Checking overall progress...")
    
    response = requests.get(f"{BASE_URL}/users/demo_user_001/progress")
    
    if response.status_code == 200:
        progress = response.json()
        print(f"   ✓ Past math score: {progress['past_math_score']}")
        print(f"   ✓ Current math score (estimated): {progress['current_math_score']}")
        print(f"   ✓ Target math score: {progress['target_math_score']}")
        print(f"   ✓ Days until test: {progress['days_until_test']}")
        print(f"   ✓ Questions answered: {progress['total_questions_answered']}")
        print(f"   ✓ Overall accuracy: {progress['overall_accuracy']:.1%}")
    else:
        print(f"   ✗ Error: {response.json()}")
        return
    
    # ========================================================================
    # STEP 7: Get Top Weak Topics
    # ========================================================================
    print("\n7. Identifying weak areas...")
    
    response = requests.get(
        f"{BASE_URL}/recommendations/demo_user_001/top-topics",
        params={"module": "math", "limit": 5}
    )
    
    if response.status_code == 200:
        top_topics = response.json()
        print(f"   Top 5 topics to focus on:")
        for i, topic_priority in enumerate(top_topics, 1):
            print(f"   {i}. {topic_priority['topic']}")
            print(f"      Priority: {topic_priority['priority_score']:.3f} | "
                  f"Mastery Gap: {topic_priority['mastery_gap']:.3f} | "
                  f"Days Since Study: {topic_priority['days_since_study']}")
    else:
        print(f"   ✗ Error: {response.json()}")
    
    print("\n" + "=" * 80)
    print("WORKFLOW COMPLETE!")
    print("=" * 80)


def example_get_all_topics():
    """
    Example: Get all available topics
    """
    print("\nGetting all available topics...")
    
    response = requests.get(f"{BASE_URL}/topics")
    
    if response.status_code == 200:
        topics = response.json()
        
        print(f"\nMath Topics ({len(topics['math'])}):")
        for topic, weight in list(topics['math'].items())[:5]:
            print(f"  - {topic} (weight: {weight})")
        print(f"  ... and {len(topics['math']) - 5} more")
        
        print(f"\nEnglish Topics ({len(topics['english'])}):")
        for topic, weight in list(topics['english'].items())[:5]:
            print(f"  - {topic} (weight: {weight})")
        print(f"  ... and {len(topics['english']) - 5} more")


def example_filter_questions():
    """
    Example: Filter questions by topic and difficulty
    """
    print("\nFiltering questions...")
    
    topic = "Linear functions"
    difficulty = "M"
    
    response = requests.get(
        f"{BASE_URL}/questions/filter/topic/{topic}",
        params={"difficulty": difficulty, "limit": 5}
    )
    
    if response.status_code == 200:
        questions = response.json()
        print(f"\nFound {len(questions)} medium-difficulty questions for '{topic}'")
        if questions:
            print(f"Example question ID: {questions[0].get('id', 'N/A')}")


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("SAT PREP ADAPTIVE LEARNING ALGORITHM - USAGE EXAMPLES")
    print("=" * 80)
    print("\nMake sure the API is running: python -m app.main")
    print("API should be available at: http://localhost:8000")
    print("\nPress Enter to start the demo...")
    input()
    
    try:
        # Run complete workflow
        example_complete_workflow()
        
        # Additional examples
        print("\n\n" + "=" * 80)
        print("ADDITIONAL EXAMPLES")
        print("=" * 80)
        
        example_get_all_topics()
        example_filter_questions()
        
        print("\n\n" + "=" * 80)
        print("✓ All examples completed successfully!")
        print("=" * 80)
        
    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Could not connect to API")
        print("Make sure the backend is running: python -m app.main")
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()

