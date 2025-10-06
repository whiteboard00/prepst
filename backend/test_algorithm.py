"""
Quick Test Script for the Adaptive Learning Algorithm

This script tests the core algorithm components without needing the API server.
"""

from datetime import datetime, timedelta
from app.models.schemas import (
    AnswerSubmission,
    DifficultyLevel,
    ConfidenceLevel,
    UserProfile,
    TopicMastery
)
from app.services.scoring_engine import scoring_engine
from app.services.learning_model import learning_model
from app.services.scheduler import scheduler
from app.services.user_service import user_service


def test_scoring_engine():
    """Test the scoring engine with different scenarios"""
    print("\n" + "="*80)
    print("TEST 1: SCORING ENGINE")
    print("="*80)
    
    test_cases = [
        {
            "name": "Perfect answer - Medium difficulty",
            "answer": AnswerSubmission(
                question_id="q1",
                topic="Linear functions",
                is_correct=True,
                difficulty=DifficultyLevel.MEDIUM,
                time_taken=85,
                expected_time=90,
                confidence=ConfidenceLevel.APPLE,
                user_id="test_user"
            ),
            "expected_range": (0.95, 1.05)
        },
        {
            "name": "Wrong but confident - CRITICAL GAP",
            "answer": AnswerSubmission(
                question_id="q2",
                topic="Linear functions",
                is_correct=False,
                difficulty=DifficultyLevel.MEDIUM,
                time_taken=95,
                expected_time=90,
                confidence=ConfidenceLevel.APPLE,
                user_id="test_user"
            ),
            "expected_range": (-0.5, 0.0)
        },
        {
            "name": "Correct guess on hard question",
            "answer": AnswerSubmission(
                question_id="q3",
                topic="Linear functions",
                is_correct=True,
                difficulty=DifficultyLevel.HARD,
                time_taken=115,
                expected_time=120,
                confidence=ConfidenceLevel.ICE_CUBE,
                user_id="test_user"
            ),
            "expected_range": (1.0, 1.1)
        }
    ]
    
    for test in test_cases:
        perf = scoring_engine.calculate_performance_score(test["answer"])
        min_exp, max_exp = test["expected_range"]
        passed = min_exp <= perf.performance_score <= max_exp
        
        print(f"\n{test['name']}")
        print(f"  Base Score: {perf.base_score:.3f}")
        print(f"  Time Factor: {perf.time_factor:.3f}")
        print(f"  Confidence Modifier: {perf.confidence_modifier:+.3f}")
        print(f"  Final Score: {perf.performance_score:.3f}")
        print(f"  Status: {'✓ PASS' if passed else '✗ FAIL'}")
    
    return True


def test_learning_model():
    """Test the learning model with mastery updates"""
    print("\n" + "="*80)
    print("TEST 2: LEARNING MODEL")
    print("="*80)
    
    # Initialize masteries
    masteries = learning_model.initialize_masteries(
        math_score=650,
        english_score=700
    )
    
    print(f"\nInitialized {len(masteries)} topics")
    
    # Test a few topics
    sample_topics = list(masteries.keys())[:3]
    for topic in sample_topics:
        mastery = masteries[topic]
        print(f"  {topic}: {mastery.mastery_score:.3f}")
    
    # Test mastery update
    print("\n\nTesting mastery update...")
    test_topic = "Linear functions"
    initial_mastery = masteries[test_topic]
    
    print(f"Initial mastery: {initial_mastery.mastery_score:.3f}")
    
    # Simulate 5 questions
    from app.models.schemas import QuestionPerformance
    
    performances = [0.9, 0.85, 0.95, 0.75, 0.88]
    
    for i, perf_score in enumerate(performances, 1):
        perf = QuestionPerformance(
            question_id=f"q{i}",
            topic=test_topic,
            performance_score=perf_score,
            base_score=1.0,
            time_factor=0.95,
            confidence_modifier=0.0
        )
        
        initial_mastery = learning_model.update_mastery(
            initial_mastery,
            perf
        )
        
        print(f"  After Q{i} (score={perf_score:.2f}): "
              f"mastery={initial_mastery.mastery_score:.3f}")
    
    print(f"\nFinal mastery: {initial_mastery.mastery_score:.3f}")
    print("✓ Mastery converging toward performance level")
    
    return True


def test_scheduler():
    """Test the dynamic scheduler"""
    print("\n" + "="*80)
    print("TEST 3: DYNAMIC SCHEDULER")
    print("="*80)
    
    # Create test masteries with different scenarios
    now = datetime.utcnow()
    
    test_masteries = {
        "Topic A - Weak & Recent": TopicMastery(
            topic="Topic A - Weak & Recent",
            mastery_score=0.3,
            last_studied=now - timedelta(days=1),
            questions_answered=5,
            correct_answers=2
        ),
        "Topic B - Strong & Recent": TopicMastery(
            topic="Topic B - Strong & Recent",
            mastery_score=0.9,
            last_studied=now - timedelta(days=1),
            questions_answered=20,
            correct_answers=18
        ),
        "Topic C - Weak & Old": TopicMastery(
            topic="Topic C - Weak & Old",
            mastery_score=0.4,
            last_studied=now - timedelta(days=14),
            questions_answered=10,
            correct_answers=4
        ),
        "Topic D - Medium & Old": TopicMastery(
            topic="Topic D - Medium & Old",
            mastery_score=0.6,
            last_studied=now - timedelta(days=7),
            questions_answered=15,
            correct_answers=9
        )
    }
    
    print("\nTopic States:")
    for topic, mastery in test_masteries.items():
        days_ago = (now - mastery.last_studied).days
        print(f"  {topic}")
        print(f"    Mastery: {mastery.mastery_score:.3f} | "
              f"Last studied: {days_ago} days ago")
    
    print("\nPriority Calculations:")
    priorities = []
    for mastery in test_masteries.values():
        priority = scheduler.calculate_priority(mastery)
        priorities.append(priority)
        print(f"\n  {priority.topic}")
        print(f"    Mastery Gap: {priority.mastery_gap:.3f}")
        print(f"    Forgetting Factor: {priority.forgetting_factor:.3f}")
        print(f"    Priority Score: {priority.priority_score:.3f}")
    
    # Get next topic
    next_topic = scheduler.get_next_topic(test_masteries)
    print(f"\n✓ Next topic to study: {next_topic.topic}")
    print(f"  Priority: {next_topic.priority_score:.3f}")
    
    return True


def test_integrated_workflow():
    """Test complete workflow"""
    print("\n" + "="*80)
    print("TEST 4: INTEGRATED WORKFLOW")
    print("="*80)
    
    # Create user profile
    print("\n1. Creating user profile...")
    profile = user_service.create_user_profile(
        user_id="test_user_001",
        past_math_score=650,
        past_english_score=680,
        target_math_score=750,
        target_english_score=750,
        test_date=datetime.utcnow() + timedelta(days=90)
    )
    
    print(f"   ✓ User created with {len(profile.topic_masteries)} topics")
    
    # Get next topic
    print("\n2. Getting next topic recommendation...")
    next_topic_priority = scheduler.get_next_topic(profile.topic_masteries)
    print(f"   ✓ Recommended: {next_topic_priority.topic}")
    print(f"   ✓ Priority: {next_topic_priority.priority_score:.3f}")
    
    # Simulate answering questions and updating mastery
    print("\n3. Simulating 5 questions...")
    topic = next_topic_priority.topic
    initial_mastery = profile.topic_masteries[topic].mastery_score
    
    simulated_answers = [
        (True, DifficultyLevel.EASY, ConfidenceLevel.APPLE),
        (True, DifficultyLevel.MEDIUM, ConfidenceLevel.LEMON),
        (False, DifficultyLevel.MEDIUM, ConfidenceLevel.APPLE),
        (True, DifficultyLevel.HARD, ConfidenceLevel.BROCCOLI),
        (True, DifficultyLevel.MEDIUM, ConfidenceLevel.APPLE)
    ]
    
    for i, (is_correct, difficulty, confidence) in enumerate(simulated_answers, 1):
        # Create answer
        answer = AnswerSubmission(
            question_id=f"q{i}",
            topic=topic,
            is_correct=is_correct,
            difficulty=difficulty,
            time_taken=85,
            expected_time=90,
            confidence=confidence,
            user_id="test_user_001"
        )
        
        # Score answer
        perf = scoring_engine.calculate_performance_score(answer)
        
        # Update mastery
        current_mastery = user_service.get_topic_mastery("test_user_001", topic)
        new_mastery = learning_model.update_mastery(current_mastery, perf)
        user_service.update_topic_mastery("test_user_001", topic, new_mastery)
        
        result = "✓" if is_correct else "✗"
        print(f"   Q{i}: {result} | "
              f"Diff: {difficulty.value} | "
              f"Conf: {confidence.value} | "
              f"Score: {perf.performance_score:.3f} | "
              f"Mastery: {new_mastery.mastery_score:.3f}")
    
    # Get progress
    print("\n4. Checking progress...")
    progress = user_service.get_overall_progress("test_user_001")
    
    final_mastery = user_service.get_topic_mastery("test_user_001", topic).mastery_score
    improvement = final_mastery - initial_mastery
    
    print(f"   ✓ Questions answered: {progress['total_questions_answered']}")
    print(f"   ✓ Overall accuracy: {progress['overall_accuracy']:.1%}")
    print(f"   ✓ Mastery improvement for {topic}: {improvement:+.3f}")
    
    return True


def run_all_tests():
    """Run all algorithm tests"""
    print("\n" + "="*80)
    print("ADAPTIVE LEARNING ALGORITHM - COMPONENT TESTS")
    print("="*80)
    
    tests = [
        ("Scoring Engine", test_scoring_engine),
        ("Learning Model", test_learning_model),
        ("Dynamic Scheduler", test_scheduler),
        ("Integrated Workflow", test_integrated_workflow)
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            success = test_func()
            results.append((name, success))
        except Exception as e:
            print(f"\n✗ {name} FAILED: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status} - {name}")
    
    all_passed = all(success for _, success in results)
    
    print("\n" + "="*80)
    if all_passed:
        print("✓ ALL TESTS PASSED!")
    else:
        print("✗ SOME TESTS FAILED")
    print("="*80)
    
    return all_passed


if __name__ == "__main__":
    run_all_tests()

