# 📊 Learning Analytics - Complete Data Flow

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    1. ANSWER QUESTION                            │
│                                                                  │
│  User selects answer + rates confidence (optional, default=3)   │
│  Clicks "Check Answer"                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                              │
│  File: app/practice/[sessionId]/page.tsx                        │
│                                                                  │
│  Data Sent:                                                      │
│  • user_answer: ["A"] or ["42"]                                 │
│  • confidence_score: 1-5 (default 3)                            │
│  • time_spent_seconds: calculated from timer                    │
│                                                                  │
│  API Call:                                                       │
│  PATCH /api/practice-sessions/{id}/questions/{qid}              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (FastAPI)                         │
│  File: backend/app/api/practice_sessions.py                     │
│                                                                  │
│  Steps:                                                          │
│  1. Validate answer                                              │
│  2. Update session_questions table                               │
│  3. Call BKTService.update_mastery()                            │
│  4. Return mastery update to frontend                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   UPDATE DATABASE        │  │   BKT SERVICE            │
│                          │  │                          │
│   session_questions:     │  │   File: bkt_service.py   │
│   • confidence_score     │  │                          │
│   • time_spent_seconds   │  │   Calculate:             │
│   • answered_at          │  │   • New mastery prob     │
│   • user_answer          │  │   • Learning velocity    │
│   • is_correct           │  │   • BKT parameters       │
└──────────────────────────┘  └──────────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
                    ▼                                           ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│   user_skill_mastery TABLE       │  │   learning_events TABLE          │
│                                  │  │                                  │
│   Updated/Inserted:              │  │   Logged:                        │
│   • mastery_probability          │  │   • event_type: "mastery_updated"│
│   • learning_velocity            │  │   • mastery_before               │
│   • total_attempts++             │  │   • mastery_after                │
│   • correct_attempts++           │  │   • event_data                   │
│   • last_practiced_at            │  │   • user_id, skill_id            │
│   • plateau_flag (calculated)    │  │   • created_at                   │
└──────────────────────────────────┘  └──────────────────────────────────┘

═══════════════════════════════════════════════════════════════════
                    USER CONTINUES PRACTICING...
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                    2. COMPLETE SESSION                           │
│                                                                  │
│  User finishes all questions                                     │
│  Navigates to summary page                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                              │
│  File: app/practice/[sessionId]/summary/page.tsx                │
│                                                                  │
│  useEffect on Mount:                                             │
│  • Calls api.completeSession(sessionId)                         │
│                                                                  │
│  API Call:                                                       │
│  POST /api/practice-sessions/{id}/complete                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (FastAPI)                         │
│  File: backend/app/api/practice_sessions.py                     │
│                                                                  │
│  Steps:                                                          │
│  1. Update session status to 'completed'                         │
│  2. Call AnalyticsService.create_performance_snapshot()         │
│  3. Return snapshot data                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   UPDATE SESSION         │  │   ANALYTICS SERVICE      │
│                          │  │                          │
│   practice_sessions:     │  │   File:                  │
│   • status = 'completed' │  │   analytics_service.py   │
│   • updated_at = now()   │  │                          │
└──────────────────────────┘  │   Calculate:             │
                              │   • Avg mastery          │
                              │   • Predicted SAT Math   │
                              │   • Predicted SAT R/W    │
                              │   • Total questions      │
                              └──────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              user_performance_snapshots TABLE                    │
│                                                                  │
│   Inserted:                                                      │
│   • user_id                                                      │
│   • snapshot_type: "session_complete"                           │
│   • predicted_sat_math: 650                                     │
│   • predicted_sat_rw: 680                                       │
│   • avg_mastery: 0.68                                           │
│   • total_questions_answered: 10                                │
│   • snapshot_data: {detailed_stats}                             │
│   • related_id: session_id                                      │
│   • created_at: now()                                           │
└─────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════
                         MONITORING & ANALYSIS
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING TOOLS                              │
│                                                                  │
│  1. Python Health Check:                                         │
│     cd backend && python3 scripts/check_analytics.py            │
│                                                                  │
│  2. SQL Queries:                                                 │
│     backend/supabase/monitoring_queries.sql                     │
│                                                                  │
│  3. Quick Test:                                                  │
│     cd backend && ./scripts/test_analytics.sh                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA AVAILABLE FOR:                           │
│                                                                  │
│  📊 Dashboards:                                                  │
│  • Growth curves (mastery over time)                            │
│  • Skill heatmaps (mastery per topic)                           │
│  • Predicted scores                                              │
│                                                                  │
│  🎯 Adaptive Learning:                                           │
│  • Next question selection                                       │
│  • Difficulty targeting (desirable difficulty)                   │
│  • Plateau detection                                             │
│                                                                  │
│  📈 Analytics:                                                   │
│  • Confidence vs performance                                     │
│  • Learning velocity trends                                      │
│  • Time spent patterns                                           │
│                                                                  │
│  🔍 Insights:                                                    │
│  • Identify struggling skills                                    │
│  • Track improvement rate                                        │
│  • Personalized recommendations                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Tables Summary

### 📝 session_questions

**Purpose:** Track each question attempt  
**Key Fields:**

- `confidence_score` (1-5)
- `time_spent_seconds`
- `answered_at`
- `user_answer`
- `is_correct`

### 🧠 user_skill_mastery

**Purpose:** Track mastery per user per skill (BKT)  
**Key Fields:**

- `mastery_probability` (0-1)
- `learning_velocity`
- `total_attempts`
- `correct_attempts`
- `plateau_flag`

### 📋 learning_events

**Purpose:** Log all learning events  
**Key Fields:**

- `event_type` ("mastery_updated")
- `mastery_before`
- `mastery_after`
- `event_data` (JSON)
- `created_at`

### 📸 user_performance_snapshots

**Purpose:** Periodic snapshots of overall performance  
**Key Fields:**

- `snapshot_type` ("session_complete")
- `predicted_sat_math`
- `predicted_sat_rw`
- `avg_mastery`
- `total_questions_answered`

### 🎯 question_difficulty_params

**Purpose:** IRT difficulty calibration  
**Key Fields:**

- `difficulty` (b parameter)
- `discrimination` (a parameter)
- `guessing_param` (c parameter)
- `times_seen`

## Query Examples

### See User Progress

```sql
SELECT
  u.email,
  COUNT(DISTINCT usm.skill_id) as skills_tracked,
  AVG(usm.mastery_probability) as avg_mastery,
  MAX(ups.predicted_sat_math) as latest_math_prediction
FROM users u
LEFT JOIN user_skill_mastery usm ON u.id = usm.user_id
LEFT JOIN user_performance_snapshots ups ON u.id = ups.user_id
GROUP BY u.id, u.email;
```

### Track Learning Over Time

```sql
SELECT
  le.created_at,
  t.name as skill,
  le.mastery_after,
  le.event_data->>'velocity' as velocity
FROM learning_events le
JOIN topics t ON t.id = le.skill_id
WHERE le.user_id = 'YOUR_USER_ID'
ORDER BY le.created_at;
```

### Analyze Confidence

```sql
SELECT
  confidence_score,
  COUNT(*) as total,
  AVG(time_spent_seconds) as avg_time,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as accuracy
FROM session_questions
WHERE confidence_score IS NOT NULL
GROUP BY confidence_score
ORDER BY confidence_score;
```

## Integration Points

### 🔌 Frontend → Backend

- **Answer Submission:** `PATCH /api/practice-sessions/{id}/questions/{qid}`
- **Session Completion:** `POST /api/practice-sessions/{id}/complete`
- **Analytics Fetch:** `GET /api/analytics/*`

### 🔌 Backend → Database

- **BKT Updates:** Via `BKTService`
- **Snapshots:** Via `AnalyticsService`
- **Events:** Direct Supabase inserts

### 🔌 Database → Monitoring

- **SQL Queries:** Direct Supabase access
- **Python Script:** Via Supabase client
- **Dashboards:** Via API endpoints

## Next Implementation Steps

1. **Adaptive Question Selection**

   - Use `mastery_probability` to select next question
   - Target 60-70% success rate (desirable difficulty)
   - Prioritize low-mastery skills

2. **Plateau Detection**

   - Monitor `learning_velocity` trends
   - Flag when velocity < threshold
   - Trigger intervention (visual explanation, analogies)

3. **Personalized Study Plans**

   - Use `user_skill_mastery` to identify weak areas
   - Schedule practice based on spacing/interleaving
   - Adjust difficulty dynamically

4. **Progress Dashboard**
   - Display growth curves from `learning_events`
   - Show skill heatmap from `user_skill_mastery`
   - Track predicted scores from `user_performance_snapshots`

---

## 🎯 Key Takeaway

Every user action flows through:

1. **Frontend** (UI interaction)
2. **Backend API** (validation & orchestration)
3. **Services** (BKT, Analytics)
4. **Database** (persistent storage)
5. **Monitoring** (verification & insights)

This creates a complete learning analytics pipeline that tracks, analyzes, and adapts to each student's unique learning journey! 🚀
