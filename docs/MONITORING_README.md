# Learning Analytics Monitoring

This directory contains tools to monitor and verify your learning analytics system.

## Quick Health Check

Run the Python script to get a quick overview of your analytics data:

```bash
cd backend
python scripts/check_analytics.py
```

This will show you:

- ✅ User skill mastery tracking status
- ✅ Confidence score & timing data collection
- ✅ Learning events being logged
- ✅ Performance snapshots
- ✅ User progress summary
- ✅ Question difficulty calibration

## Detailed SQL Queries

For more detailed analysis, use the queries in `monitoring_queries.sql`:

### 1. User Skill Mastery Tracking

Shows each user's mastery level for each skill/topic.

```sql
SELECT
  u.email,
  t.name as topic,
  usm.mastery_probability,
  usm.total_attempts,
  usm.correct_attempts,
  usm.learning_velocity,
  usm.plateau_flag
FROM user_skill_mastery usm
JOIN users u ON u.id = usm.user_id
JOIN topics t ON t.id = usm.skill_id
ORDER BY usm.mastery_probability ASC;
```

### 2. Confidence & Timing Data

Verifies that confidence scores and timing data are being captured.

```sql
SELECT
  COUNT(*) as total_answered,
  AVG(confidence_score) as avg_confidence,
  AVG(time_spent_seconds) as avg_time_seconds
FROM session_questions
WHERE confidence_score IS NOT NULL;
```

### 3. Learning Events Log

Shows what types of events are being logged.

```sql
SELECT
  event_type,
  COUNT(*) as count
FROM learning_events
GROUP BY event_type;
```

## Running Queries in Supabase

1. **Via Supabase Dashboard:**

   - Go to your Supabase project
   - Navigate to **SQL Editor**
   - Paste any query from `monitoring_queries.sql`
   - Click **Run**

2. **Via psql:**

   ```bash
   # Get your connection string from Supabase Dashboard > Project Settings > Database
   psql "postgresql://[connection-string]"

   # Then run queries
   \i monitoring_queries.sql
   ```

3. **Via Python (Supabase Client):**

   ```python
   from supabase import create_client

   supabase = create_client(url, key)
   result = supabase.table('user_skill_mastery').select('*').execute()
   ```

## Key Metrics to Monitor

### 📊 Mastery Tracking

- **What to check:** `user_skill_mastery` table has records
- **Expected:** One record per user per skill after they answer questions
- **Red flag:** Empty table after users complete sessions

### ⏱️ Confidence & Timing

- **What to check:** `session_questions` has `confidence_score` and `time_spent_seconds`
- **Expected:** Values between 1-5 for confidence, realistic seconds for timing
- **Red flag:** All null values or unrealistic numbers

### 📝 Learning Events

- **What to check:** `learning_events` table logs "mastery_updated" events
- **Expected:** Events created after each question submission
- **Red flag:** No events or events without data

### 📸 Performance Snapshots

- **What to check:** `user_performance_snapshots` created on session completion
- **Expected:** Snapshots with predicted SAT scores
- **Red flag:** No snapshots after completing sessions

### 🎯 Question Difficulty (IRT)

- **What to check:** `question_difficulty_params` has calibrated questions
- **Expected:** Difficulty values around -3 to +3, discrimination > 0
- **Red flag:** Unrealistic parameter values

## Troubleshooting

### No Mastery Records

**Problem:** `user_skill_mastery` table is empty

**Cause:** Users haven't answered questions yet, or BKT service isn't running

**Fix:**

1. Ensure backend is running
2. Check backend logs for errors in `BKTService`
3. Verify practice session endpoint is calling `update_mastery`

### No Confidence Scores

**Problem:** `confidence_score` is always null

**Cause:** Frontend not sending confidence data

**Fix:**

1. Check browser console for errors
2. Verify `ConfidenceRating` component is rendering
3. Check network tab for POST to `/practice-sessions/*/questions/*`

### No Performance Snapshots

**Problem:** `user_performance_snapshots` table is empty

**Cause:** Session completion endpoint not being called

**Fix:**

1. Check if `/practice-sessions/*/complete` is being called on summary page
2. Verify `completeSessionOnMount` useEffect is running
3. Check backend logs for errors in `AnalyticsService`

### Learning Velocity Not Updating

**Problem:** `learning_velocity` is always null

**Cause:** Not enough data points to calculate velocity

**Fix:**

1. Users need to answer multiple questions in same skill
2. Check that `calculate_learning_velocity()` is being called
3. Verify time windows in velocity calculation

## Data Export

To export data for external analysis:

```bash
# Export mastery data
psql "connection-string" -c "COPY (SELECT * FROM user_skill_mastery) TO STDOUT WITH CSV HEADER" > mastery_export.csv

# Export learning events
psql "connection-string" -c "COPY (SELECT * FROM learning_events) TO STDOUT WITH CSV HEADER" > events_export.csv
```

## Performance Optimization

If queries are slow:

1. **Check indexes:**

   ```sql
   SELECT schemaname, tablename, indexname
   FROM pg_indexes
   WHERE tablename IN ('user_skill_mastery', 'learning_events', 'session_questions');
   ```

2. **Add missing indexes:**

   ```sql
   CREATE INDEX IF NOT EXISTS idx_learning_events_user_skill
     ON learning_events(user_id, skill_id);

   CREATE INDEX IF NOT EXISTS idx_session_questions_user_topic
     ON session_questions(user_id, topic_id);
   ```

3. **Vacuum tables:**
   ```sql
   VACUUM ANALYZE user_skill_mastery;
   VACUUM ANALYZE learning_events;
   VACUUM ANALYZE session_questions;
   ```

## Dashboard Ideas

Consider building dashboards with this data:

1. **Student Progress Dashboard**

   - Growth curves over time
   - Skill mastery heatmap
   - Predicted SAT scores

2. **Content Quality Dashboard**

   - Question difficulty distribution
   - Question discrimination analysis
   - Topics with highest/lowest mastery

3. **Engagement Dashboard**
   - Average confidence by topic
   - Time spent patterns
   - Learning velocity trends

## Support

If you encounter issues with monitoring:

1. Check backend logs: `backend/logs/`
2. Enable debug logging in `backend/app/main.py`
3. Verify migrations ran successfully: `ls backend/supabase/migrations/`
