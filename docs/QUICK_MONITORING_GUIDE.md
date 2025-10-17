# 🚀 Quick Monitoring Guide

## 30-Second Health Check

```bash
cd backend
python3 scripts/check_analytics.py
```

## Most Useful Queries

### 1. Are users learning? (Check mastery)

```sql
SELECT
  u.email,
  t.name as topic,
  usm.mastery_probability,
  usm.total_attempts
FROM user_skill_mastery usm
JOIN users u ON u.id = usm.user_id
JOIN topics t ON t.id = usm.skill_id
ORDER BY usm.mastery_probability ASC;
```

### 2. Is confidence tracking working?

```sql
SELECT
  COUNT(*) as total_answered,
  AVG(confidence_score) as avg_confidence,
  AVG(time_spent_seconds) as avg_time_seconds
FROM session_questions
WHERE confidence_score IS NOT NULL;
```

### 3. Are sessions completing?

```sql
SELECT
  COUNT(*) as count
FROM learning_events
GROUP BY event_type;
```

## Quick Checks

| What           | Check                                  | Expected                 | Bad Sign |
| -------------- | -------------------------------------- | ------------------------ | -------- |
| **Mastery**    | `user_skill_mastery` table             | Has records              | Empty    |
| **Confidence** | `session_questions.confidence_score`   | 1-5 values               | All null |
| **Timing**     | `session_questions.time_spent_seconds` | Realistic numbers        | All null |
| **Events**     | `learning_events` table                | "mastery_updated" events | Empty    |
| **Snapshots**  | `user_performance_snapshots`           | Created on session end   | Empty    |

## Where's My Data?

### User answered a question → 3 places updated:

1. ✅ `session_questions` - confidence_score, time_spent_seconds
2. ✅ `user_skill_mastery` - mastery_probability updated
3. ✅ `learning_events` - "mastery_updated" event logged

### User completed session → 2 places updated:

1. ✅ `practice_sessions.status` = 'completed'
2. ✅ `user_performance_snapshots` - new snapshot with SAT predictions

## Troubleshooting

### No data showing up?

1. **Check backend is running:**

   ```bash
   curl http://localhost:8000/health
   ```

2. **Check frontend is calling APIs:**

   - Open browser DevTools > Network tab
   - Look for PATCH requests to `/practice-sessions/*/questions/*`
   - Should include `confidence_score` and `time_spent_seconds`

3. **Check Supabase connection:**
   ```bash
   cd backend
   python3 -c "from supabase import create_client; import os; from dotenv import load_dotenv; load_dotenv(); print('✅ Connected' if create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY')) else '❌ Failed')"
   ```

### Data looks weird?

**Mastery always 0.25?**

- Users haven't answered enough questions yet
- Need at least 1-2 questions per skill

**Confidence always null?**

- ConfidenceRating component not rendering
- Check `AnswerPanel.tsx` includes component
- Check browser console for errors

**Time always null?**

- Timer not tracking correctly
- Check `useTimer` hook is working
- Verify `getTimeSpent()` returns value

## Quick Wins

### See user progress

```sql
SELECT
  email,
  COUNT(DISTINCT skill_id) as skills_tracked,
  AVG(mastery_probability) as avg_mastery
FROM user_skill_mastery usm
JOIN users u ON u.id = usm.user_id
GROUP BY email;
```

### Find struggling students

```sql
SELECT email, name as topic, mastery_probability
FROM user_skill_mastery usm
JOIN users u ON u.id = usm.user_id
JOIN topics t ON t.id = usm.skill_id
WHERE mastery_probability < 0.5;
```

### Confidence vs accuracy

```sql
SELECT
  confidence_score,
  COUNT(*) as total,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
  ROUND(100.0 * SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy
FROM session_questions
WHERE confidence_score IS NOT NULL
GROUP BY confidence_score
ORDER BY confidence_score;
```

## Full Documentation

- 📖 **Complete setup:** `ANALYTICS_SETUP_COMPLETE.md`
- 📊 **All queries:** `backend/supabase/monitoring_queries.sql`
- 🔧 **Detailed monitoring:** `backend/supabase/MONITORING_README.md`
- 🧠 **Implementation details:** `BKT_IMPLEMENTATION_SUMMARY.md`
