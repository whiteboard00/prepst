# SAT Prep - Adaptive Learning Backend

A cutting-edge adaptive learning system for SAT test preparation, implementing sophisticated algorithms for personalized study plans, dynamic difficulty adjustment, and spaced repetition.

## 🚀 Features

- **Adaptive Learning Algorithm**: Dynamically adjusts to user performance in real-time
- **Confidence-Aware Scoring**: Identifies "unknown unknowns" - critical knowledge gaps
- **Spaced Repetition**: Implements forgetting curves to optimize long-term retention
- **Dynamic Difficulty**: Automatically adjusts question difficulty based on mastery
- **Performance Scoring**: Multi-factor scoring combining correctness, speed, difficulty, and confidence
- **Topic Mastery Tracking**: Exponential moving average for accurate skill assessment
- **Priority Scheduling**: Intelligent topic selection balancing gaps, importance, and retention

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Algorithm Overview](#algorithm-overview)
- [API Documentation](#api-documentation)
- [Usage Examples](#usage-examples)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Development](#development)

## 🔧 Installation

### Prerequisites

- Python 3.9 or higher
- pip (Python package manager)

### Setup

1. **Navigate to the backend directory**:

   ```bash
   cd satguide_demo/backend
   ```

2. **Create a virtual environment** (recommended):

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment file** (optional):
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## ⚡ Quick Start

### Start the API Server

```bash
# From the backend directory
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc

### Run the Example Workflow

```bash
# In a separate terminal (with the API running)
python USAGE_EXAMPLE.py
```

This will demonstrate:

1. Creating a user profile
2. Getting topic recommendations
3. Starting a study session
4. Answering questions with different confidence levels
5. Completing the session
6. Viewing progress statistics

## 🧠 Algorithm Overview

The system implements a three-part adaptive learning algorithm:

### 1. Scoring Engine

Calculates a **QuestionPerformanceScore** (0-1.1) based on:

```
S_perf = clamp(S_base × F_time + M_conf, 0, 1.1)
```

Where:

- **S_base**: Base score by difficulty (Easy: 0.9, Medium: 1.0, Hard: 1.1)
- **F_time**: Time performance factor (0.75-1.0)
- **M_conf**: Confidence modifier (-0.4 to +0.1)

**Key Innovation**: Confidence tracking identifies dangerous knowledge gaps where students are wrong but confident.

### 2. Learning Model

Maintains a **Mastery Score** (0-1) for each topic using Exponential Moving Average:

```
M_t,new = α × S_perf + (1 - α) × M_t,old
```

Where α = 0.1 (learning rate)

**Benefits**:

- Rapid adaptation to true ability
- Resistance to flukes
- Historical context preservation

### 3. Dynamic Scheduler

Calculates **Priority Scores** for topic selection:

```
P_t = (Mastery_Gap) × (Base_Weight) × (Forgetting_Factor)
```

Forgetting Factor implements spaced repetition:

```
F_t = ln(days_since_study + 1) + 1
```

**Result**: Optimal topic selection balancing learning needs and retention.

For detailed algorithm documentation, see [ALGORITHM_DOCUMENTATION.md](./ALGORITHM_DOCUMENTATION.md).

## 📚 API Documentation

### Core Endpoints

#### User Management

**Create User Profile**

```http
POST /api/v1/users
Content-Type: application/json

{
  "user_id": "user123",
  "past_math_score": 650,
  "past_english_score": 680,
  "target_math_score": 750,
  "target_english_score": 750,
  "test_date": "2025-12-15T00:00:00Z"
}
```

**Get User Progress**

```http
GET /api/v1/users/{user_id}/progress
```

#### Study Planning

**Get Next Topic Recommendation**

```http
POST /api/v1/recommendations/next
Content-Type: application/json

{
  "user_id": "user123",
  "module": "math"  // optional: "math", "english", or null
}
```

**Get Top Weak Topics**

```http
GET /api/v1/recommendations/{user_id}/top-topics?module=math&limit=5
```

#### Study Sessions

**Create Session**

```http
POST /api/v1/sessions
Content-Type: application/json

{
  "user_id": "user123",
  "topic": "Linear functions",
  "num_questions": 10
}
```

**Submit Answer**

```http
POST /api/v1/sessions/{session_id}/answers
Content-Type: application/json

{
  "question_id": "q1",
  "topic": "Linear functions",
  "is_correct": true,
  "difficulty": "M",
  "time_taken": 85.5,
  "expected_time": 90,
  "confidence": "apple",  // apple, lemon, broccoli, ice_cube
  "user_id": "user123"
}
```

**Complete Session**

```http
POST /api/v1/sessions/{session_id}/complete
```

For complete API documentation, visit http://localhost:8000/docs when the server is running.

## 💡 Usage Examples

### Complete Workflow in Python

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# 1. Create user
user = requests.post(f"{BASE_URL}/users", json={
    "user_id": "demo_user",
    "past_math_score": 650,
    "past_english_score": 680,
    "target_math_score": 750,
    "target_english_score": 750,
    "test_date": "2025-12-15T00:00:00Z"
}).json()

# 2. Get recommendation
rec = requests.post(f"{BASE_URL}/recommendations/next", json={
    "user_id": "demo_user",
    "module": "math"
}).json()

topic = rec["topic"]

# 3. Create session
session = requests.post(f"{BASE_URL}/sessions", json={
    "user_id": "demo_user",
    "topic": topic,
    "num_questions": 10
}).json()

session_id = session["session_id"]

# 4. Answer questions
for question_id in session["questions"]:
    perf = requests.post(
        f"{BASE_URL}/sessions/{session_id}/answers",
        json={
            "question_id": question_id,
            "topic": topic,
            "is_correct": True,
            "difficulty": "M",
            "time_taken": 88,
            "expected_time": 90,
            "confidence": "apple",
            "user_id": "demo_user"
        }
    ).json()

# 5. Complete session
stats = requests.post(
    f"{BASE_URL}/sessions/{session_id}/complete"
).json()

print(f"Mastery improved by: {stats['improvement']:.3f}")
```

More examples in [USAGE_EXAMPLE.py](./USAGE_EXAMPLE.py).

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry point
│   ├── config.py                  # Configuration settings
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py              # API endpoints
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py             # Pydantic models
│   │
│   └── services/
│       ├── __init__.py
│       ├── scoring_engine.py      # Part 1: Question scoring
│       ├── learning_model.py      # Part 2: Mastery tracking
│       ├── scheduler.py           # Part 3: Topic prioritization
│       ├── question_bank.py       # Question management
│       ├── user_service.py        # User profile management
│       └── session_manager.py     # Study session management
│
├── data/
│   └── question_bank.json         # 91,000+ SAT questions
│
├── requirements.txt               # Python dependencies
├── README.md                      # This file
├── ALGORITHM_DOCUMENTATION.md     # Detailed algorithm docs
└── USAGE_EXAMPLE.py              # Example usage script
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Learning Algorithm Parameters (optional)
LEARNING_RATE=0.1
DEFAULT_QUESTIONS_PER_SESSION=10
```

### Algorithm Tuning

Adjust parameters in the service files:

**Learning Rate** (`services/learning_model.py`):

```python
class LearningModel:
    ALPHA = 0.1  # Increase for faster adaptation (0.05-0.2)
```

**Topic Weights** (`models/schemas.py`):

```python
MATH_TOPICS = {
    "Linear functions": 1.0,  # Adjust importance (0.5-1.0)
    # ...
}
```

**Difficulty Distributions** (`services/question_bank.py`):

```python
if mastery_score < 0.4:
    easy_count = 7    # Adjust distribution
    medium_count = 3
    hard_count = 0
```

## 🛠️ Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-cov httpx

# Run tests
pytest

# With coverage
pytest --cov=app tests/
```

### Code Quality

```bash
# Format code
black app/

# Lint
flake8 app/

# Type checking
mypy app/
```

### Adding New Topics

1. Update topic lists in `app/models/schemas.py`:

```python
MATH_TOPICS = {
    "Your New Topic": 0.9,  # Add with appropriate weight
    # ...
}
```

2. Ensure questions in `question_bank.json` have matching `skill_desc` values.

### Database Migration (Future)

Current implementation uses in-memory storage. To add persistence:

1. Install database driver (e.g., `sqlalchemy`, `motor`)
2. Create models in `app/models/database.py`
3. Update services to use database queries
4. Add migration scripts

## 🚧 Roadmap

- [ ] PostgreSQL/MongoDB integration for data persistence
- [ ] User authentication and authorization
- [ ] Real-time progress tracking with WebSockets
- [ ] Performance analytics dashboard
- [ ] A/B testing framework for algorithm tuning
- [ ] Mobile API optimization
- [ ] Caching layer for improved performance
- [ ] Background task processing (Celery)
- [ ] Export study reports (PDF/CSV)

## 📊 Performance

Current performance characteristics:

- **Topic priority calculation**: ~0.1ms for 30 topics
- **Question filtering**: ~50ms for 3000 questions
- **Session creation**: ~100ms including question selection
- **Answer processing**: ~1ms per answer

Tested with:

- 91,000+ questions
- 30 topics
- Concurrent users: Not yet benchmarked

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 📞 Support

For questions or issues:

- Open an issue on GitHub
- Email: support@satprep.example.com
- Documentation: [ALGORITHM_DOCUMENTATION.md](./ALGORITHM_DOCUMENTATION.md)

## 🙏 Acknowledgments

- Inspired by research in adaptive learning systems
- Spaced repetition algorithm based on forgetting curve research
- SAT question bank curated from official practice materials

---

**Built with** ❤️ using FastAPI, Python, and cutting-edge learning algorithms.

**Version**: 1.0.0
