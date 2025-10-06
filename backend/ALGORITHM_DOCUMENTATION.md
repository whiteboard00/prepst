# SAT Prep Adaptive Learning Algorithm

## Overview

This document describes the cutting-edge adaptive learning algorithm implemented for the SAT preparation platform. The algorithm dynamically adjusts study plans based on user performance, implements spaced repetition, and optimizes learning efficiency through sophisticated scoring mechanisms.

## Algorithm Components

### 1. The Scoring Engine (Part 1)

The scoring engine calculates a **QuestionPerformanceScore** (0 to 1.1) for each answered question by combining multiple factors:

#### Components:

**A. Base Score & Difficulty Weight (S_base)**

Rewards are calibrated by difficulty:

- **Correct Easy**: 0.9
- **Correct Medium**: 1.0
- **Correct Hard**: 1.1
- **Incorrect (any)**: 0

_Rationale_: Correctly answering harder questions demonstrates greater mastery.

**B. Time Performance Factor (F_time)**

Measures how efficiently the question was answered (range: 0.75 to 1.0):

```
If time_taken ≤ expected_time:
    F_time = 1.0

If time_taken > expected_time:
    F_time = max(0.75, 1 - (time_taken - expected_time) / (2 × expected_time))
```

_Rationale_: Speed matters on the SAT, but we don't over-penalize careful thinking.

**C. Confidence Modifier (M_conf)**

Identifies "unknown unknowns" - critical knowledge gaps where students are confident but wrong:

| Confidence Level       | Correct Bonus | Incorrect Penalty   |
| ---------------------- | ------------- | ------------------- |
| 🍎 Apple (Confident)   | +0.0          | **-0.4** (CRITICAL) |
| 🍋 Lemon (75% Sure)    | +0.0          | -0.2                |
| 🥦 Broccoli (50% Sure) | +0.05         | -0.1                |
| 🧊 Ice Cube (Guess)    | +0.1          | 0.0                 |

_Rationale_: The most dangerous knowledge gaps are when students think they know but don't. Guesses that happen to be correct indicate some latent knowledge.

**D. Final Performance Score**

```
S_perf = clamp(S_base × F_time + M_conf, 0, 1.1)
```

### 2. The Learning Model (Part 2)

Each of the ~30 topics maintains a **Mastery Score** (M_t) ranging from 0.0 to 1.0.

#### Exponential Moving Average (EMA) Update

After each question, the mastery score updates:

```
M_t,new = α × S_perf + (1 - α) × M_t,old
```

Where:

- **α = 0.1** (learning rate - how quickly new answers affect the score)
- **S_perf** = performance score of the just-answered question
- **M_t,old** = current mastery score

_Rationale_: EMA gives more weight to recent performance while maintaining historical context. A lower alpha (0.1) prevents wild swings from single questions.

#### Initial State

User's initial SAT scores determine starting mastery:

```
Initial_Mastery = (SAT_Score - 200) / 600
```

For example:

- 700/800 → 0.833 mastery
- 500/800 → 0.500 mastery
- 350/800 → 0.250 mastery

### 3. The Dynamic Scheduler (Part 3)

The scheduler calculates a **Priority Score** for each topic to determine what to study next.

#### Priority Formula

```
P_t = (Mastery_Gap) × (Base_Weight) × (Forgetting_Factor)
```

**A. Mastery Gap**

```
Mastery_Gap = 1 - M_t
```

Higher gap = lower current mastery = higher priority

**B. Base Weight (W_t)**

Predefined importance of each topic on the actual SAT:

- Critical topics (e.g., "Linear Functions"): 1.0
- Important topics: 0.85-0.95
- Secondary topics: 0.7-0.8

**C. Forgetting Factor (F_t)**

Implements **Spaced Repetition**:

```
F_t = ln(d + 1) + 1
```

Where d = days since last study

Examples:

- Today (d=0): F = 1.0 (no boost)
- Yesterday (d=1): F ≈ 1.69
- Week ago (d=7): F ≈ 3.07
- Month ago (d=30): F ≈ 4.43

_Rationale_: Topics studied long ago need review, but not with linear urgency. Logarithmic growth prevents old topics from dominating.

#### Topic Selection

At each study session:

1. Calculate P_t for all topics
2. Select the topic with highest P_t
3. No topic ever "disappears" - all remain candidates

## User Flow

### 1. Onboarding

```
POST /api/v1/users
{
  "user_id": "user123",
  "past_math_score": 650,
  "past_english_score": 700,
  "target_math_score": 750,
  "target_english_score": 750,
  "test_date": "2025-12-15T00:00:00Z"
}
```

**Result**: All ~30 topic masteries initialized based on scores.

### 2. Get Next Topic

```
POST /api/v1/recommendations/next
{
  "user_id": "user123",
  "module": "math"  // optional: "math", "english", or null
}
```

**Response**:

```json
{
  "topic": "Nonlinear functions",
  "priority_score": 2.45,
  "current_mastery": 0.42,
  "target_mastery": 0.75,
  "questions_count": 847,
  "estimated_time_minutes": 15,
  "reason": "This topic has low mastery (0.42). Focus here for maximum improvement."
}
```

### 3. Start Study Session

```
POST /api/v1/sessions
{
  "user_id": "user123",
  "topic": "Nonlinear functions",
  "num_questions": 10
}
```

**Dynamic Question Selection**:

The system selects questions based on current mastery:

| Mastery Level             | Easy | Medium | Hard |
| ------------------------- | ---- | ------ | ---- |
| < 0.4 (Beginner)          | 7    | 3      | 0    |
| 0.4 - 0.75 (Intermediate) | 2    | 6      | 2    |
| ≥ 0.75 (Advanced)         | 0    | 1      | 9    |

**Response**:

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user123",
  "topic": "Nonlinear functions",
  "questions": ["q1", "q2", "q3", ...],
  "started_at": "2025-10-06T12:00:00Z"
}
```

### 4. Answer Questions

For each question:

```
POST /api/v1/sessions/{session_id}/answers
{
  "question_id": "q1",
  "topic": "Nonlinear functions",
  "is_correct": true,
  "difficulty": "M",
  "time_taken": 85.5,
  "expected_time": 90,
  "confidence": "lemon",
  "user_id": "user123"
}
```

**Backend Processing**:

1. Calculate S_perf using the scoring engine
2. Update M_t using EMA
3. Store performance data

**Response**:

```json
{
  "question_id": "q1",
  "topic": "Nonlinear functions",
  "performance_score": 0.95,
  "base_score": 1.0,
  "time_factor": 0.97,
  "confidence_modifier": 0.0,
  "timestamp": "2025-10-06T12:02:30Z"
}
```

### 5. Complete Session

```
POST /api/v1/sessions/{session_id}/complete
```

**Response**:

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "topic": "Nonlinear functions",
  "total_questions": 10,
  "correct_answers": 7,
  "average_time": 0.92,
  "mastery_before": 0.42,
  "mastery_after": 0.49,
  "improvement": 0.07
}
```

### 6. Repeat

User clicks "Start Next Session" → Back to Step 2

The algorithm continuously adapts, ensuring optimal learning at every moment.

## Key Advantages

### 1. **No Topic Left Behind**

Every topic remains a candidate for study. The priority system ensures weak areas get attention while maintaining strong ones through spaced repetition.

### 2. **Confidence-Aware Learning**

The confidence modifier identifies dangerous knowledge gaps - areas where students are overconfident but incorrect. This is often more valuable than simply tracking correctness.

### 3. **Adaptive Difficulty**

Question difficulty automatically adjusts based on demonstrated mastery, keeping students in their optimal learning zone (not too easy, not too hard).

### 4. **Spaced Repetition**

The forgetting factor ensures topics aren't forgotten. The longer since last review, the higher the boost - but with logarithmic rather than linear growth to prevent old topics from monopolizing study time.

### 5. **Time Awareness**

Performance considers both accuracy AND speed, preparing students for the timed nature of the SAT.

### 6. **Continuous Adaptation**

Every single answer affects the algorithm. No waiting for "session end" or "week completion" - the system adapts in real-time.

## Mathematical Properties

### Convergence Behavior

With α = 0.1:

- 10 questions → ~65% weight on new performance
- 20 questions → ~88% weight on new performance
- 50 questions → ~99% weight on new performance

This ensures:

1. Rapid adaptation to actual ability
2. Resistance to flukes/lucky guesses
3. Eventual convergence to true mastery level

### Priority Score Dynamics

Example scenario for a weak, recently-studied topic:

```
Mastery_Gap = 0.7 (30% mastery)
Base_Weight = 0.9 (important topic)
Forgetting_Factor = 1.0 (studied today)
Priority = 0.7 × 0.9 × 1.0 = 0.63
```

Same topic after 7 days without study:

```
Mastery_Gap = 0.7 (unchanged)
Base_Weight = 0.9 (unchanged)
Forgetting_Factor = 3.07
Priority = 0.7 × 0.9 × 3.07 = 1.93 (3x boost!)
```

## Implementation Notes

### In-Memory Storage (Current)

The current implementation uses in-memory dictionaries. For production:

- Migrate to PostgreSQL/MongoDB for persistence
- Add user authentication
- Implement data backup/recovery

### Question Bank

Questions are loaded from `question_bank.json` which contains:

- ~91,000 questions
- Mapped to topics via `skill_desc`
- Difficulty levels: E (Easy), M (Medium), H (Hard)

### Extensibility

The algorithm supports easy extensions:

- **Custom topic weights**: Adjust `MATH_TOPICS` and `ENGLISH_TOPICS` dictionaries
- **Learning rate tuning**: Modify `LearningModel.ALPHA`
- **Confidence levels**: Add more granular options in `ConfidenceLevel` enum
- **Difficulty distributions**: Adjust thresholds in `get_questions_for_session`

## API Reference Summary

| Endpoint                                       | Method | Purpose               |
| ---------------------------------------------- | ------ | --------------------- |
| `/api/v1/users`                                | POST   | Create user profile   |
| `/api/v1/users/{user_id}`                      | GET    | Get user profile      |
| `/api/v1/users/{user_id}/progress`             | GET    | Get progress stats    |
| `/api/v1/recommendations/next`                 | POST   | Get next topic        |
| `/api/v1/recommendations/{user_id}/top-topics` | GET    | Get top N weak topics |
| `/api/v1/sessions`                             | POST   | Create study session  |
| `/api/v1/sessions/{session_id}/answers`        | POST   | Submit answer         |
| `/api/v1/sessions/{session_id}/complete`       | POST   | Complete session      |
| `/api/v1/questions/{question_id}`              | GET    | Get question details  |
| `/api/v1/topics`                               | GET    | List all topics       |

## Performance Considerations

### Time Complexity

- Topic priority calculation: O(T) where T = number of topics (~30)
- Question filtering: O(Q) where Q = questions in topic (~3000 avg)
- Session creation: O(Q) for filtering + O(N log N) for sampling

### Space Complexity

- User profile: O(T) for mastery scores
- Session storage: O(S × Q) where S = active sessions

### Optimization Opportunities

1. **Question indexing**: Pre-index questions by topic+difficulty
2. **Caching**: Cache priority calculations until mastery changes
3. **Batch processing**: Process multiple answers in one transaction

---

**Built with**: FastAPI, Python 3.9+, Pydantic

**License**: MIT

**Version**: 1.0.0
