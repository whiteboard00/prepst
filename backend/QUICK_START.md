# Quick Start Guide - SAT Prep Adaptive Learning

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd satguide_demo/backend
pip install -r requirements.txt
```

### Step 2: Start the Server

```bash
python -m app.main
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Step 3: Try the API

Open your browser to: **http://localhost:8000/docs**

You'll see interactive API documentation where you can test endpoints directly!

### Step 4: Test the Algorithm

In a new terminal:

```bash
cd satguide_demo/backend
python test_algorithm.py
```

This runs comprehensive tests of all algorithm components.

## 📖 Basic Usage Flow

### 1. Create a User

```bash
curl -X POST "http://localhost:8000/api/v1/users" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "student123",
    "past_math_score": 650,
    "past_english_score": 680,
    "target_math_score": 750,
    "target_english_score": 750,
    "test_date": "2025-12-15T00:00:00Z"
  }'
```

### 2. Get Next Topic to Study

```bash
curl -X POST "http://localhost:8000/api/v1/recommendations/next" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "student123",
    "module": "math"
  }'
```

Response shows which topic to study and why!

### 3. Start a Study Session

```bash
curl -X POST "http://localhost:8000/api/v1/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "student123",
    "topic": "Linear functions",
    "num_questions": 10
  }'
```

Returns a session with 10 dynamically selected questions.

### 4. Answer a Question

```bash
curl -X POST "http://localhost:8000/api/v1/sessions/{session_id}/answers" \
  -H "Content-Type: application/json" \
  -d '{
    "question_id": "q1",
    "topic": "Linear functions",
    "is_correct": true,
    "difficulty": "M",
    "time_taken": 85,
    "expected_time": 90,
    "confidence": "apple",
    "user_id": "student123"
  }'
```

Mastery updates immediately after each answer!

### 5. Complete Session

```bash
curl -X POST "http://localhost:8000/api/v1/sessions/{session_id}/complete"
```

Get session statistics and mastery improvement.

## 🎯 Key Concepts

### Confidence Levels

When answering, users select their confidence:

- 🍎 **apple** - "I'm confident" (penalty if wrong!)
- 🍋 **lemon** - "75% sure"
- 🥦 **broccoli** - "50/50 guess"
- 🧊 **ice_cube** - "Complete guess" (no penalty if wrong)

### Difficulty Levels

- **E** - Easy
- **M** - Medium
- **H** - Hard

The system automatically selects appropriate difficulty based on mastery.

### Mastery Score

Each topic has a score from 0.0 to 1.0:

- **0.0 - 0.4**: Beginner (mostly easy questions)
- **0.4 - 0.75**: Intermediate (balanced mix)
- **0.75 - 1.0**: Advanced (mostly hard questions)

## 📊 View Progress

```bash
curl "http://localhost:8000/api/v1/users/student123/progress"
```

Returns:

- Current estimated SAT scores
- Total questions answered
- Overall accuracy
- Days until test
- Average mastery by subject

## 🔍 Find Weak Areas

```bash
curl "http://localhost:8000/api/v1/recommendations/student123/top-topics?module=math&limit=5"
```

Shows the 5 topics that need the most attention.

## 🎓 Understanding the Algorithm

The system uses a 3-part algorithm:

1. **Scoring Engine** - Scores each answer (0-1.1) based on:

   - Correctness + difficulty
   - Time taken vs expected
   - Confidence level (identifies overconfidence!)

2. **Learning Model** - Updates topic mastery using EMA:

   - Gives more weight to recent performance
   - Converges to true ability over 20-50 questions

3. **Dynamic Scheduler** - Prioritizes topics using:
   - Mastery gap (how weak)
   - Topic importance (test weight)
   - Forgetting factor (time since last study)

## 📚 More Information

- **Full Algorithm Details**: See `ALGORITHM_DOCUMENTATION.md`
- **Complete API Docs**: See `README.md` or visit `/docs` endpoint
- **Code Examples**: See `USAGE_EXAMPLE.py`
- **Implementation Summary**: See `../IMPLEMENTATION_SUMMARY.md`

## 🆘 Common Issues

### "Module not found" error

```bash
# Make sure you're in the backend directory
cd satguide_demo/backend

# Install dependencies
pip install -r requirements.txt
```

### "Address already in use"

```bash
# Change the port in .env or:
uvicorn app.main:app --port 8001
```

### "No questions found for topic"

Make sure `data/question_bank.json` exists and is properly formatted.

## ✅ Next Steps

1. **Run the test suite** to verify everything works
2. **Try the interactive docs** at http://localhost:8000/docs
3. **Connect your frontend** using the API endpoints
4. **Customize topic weights** in `app/models/schemas.py`
5. **Tune the algorithm** by adjusting constants in services

## 🎉 You're Ready!

The adaptive learning algorithm is now running and ready to personalize SAT prep for your users!

---

**Need help?** Check the full documentation files or open an issue.

**Version:** 1.0.0
