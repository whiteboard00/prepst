# Project Architecture Helper

Quick reference for SAT Prep adaptive learning platform.

---

## 📁 Project Structure

```
sat_guide_w26/
├── satguide_demo/
│   ├── backend/          # Python FastAPI server
│   └── frontend/         # Next.js React app
└── *.md                  # Documentation files
```

---

## 🔧 Backend Structure

### **Root: `satguide_demo/backend/`**

```
backend/
├── app/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Configuration settings
│   │
│   ├── api/
│   │   └── routes.py              # API endpoints (15+)
│   │
│   ├── models/
│   │   └── schemas.py             # Pydantic models (20+ types)
│   │
│   └── services/
│       ├── scoring_engine.py      # Part 1: Question scoring algorithm
│       ├── learning_model.py      # Part 2: Mastery tracking (EMA)
│       ├── scheduler.py           # Part 3: Topic priority (spaced repetition)
│       ├── question_bank.py       # Question filtering & selection
│       ├── user_service.py        # User profile management
│       └── session_manager.py     # Study session orchestration
│
├── data/
│   └── question_bank.json         # 91,000+ SAT questions
│
├── requirements.txt               # Python dependencies
└── test_algorithm.py             # Algorithm tests
```

### **Key Backend Files**

| File                   | Purpose           | Key Functions                    |
| ---------------------- | ----------------- | -------------------------------- |
| **main.py**            | FastAPI app setup | CORS, routes, startup            |
| **routes.py**          | API endpoints     | 15+ REST endpoints               |
| **schemas.py**         | Data models       | UserProfile, TopicMastery, etc.  |
| **scoring_engine.py**  | Score answers     | Calculate S_perf (0-1.1)         |
| **learning_model.py**  | Update mastery    | EMA algorithm, initialize topics |
| **scheduler.py**       | Prioritize topics | Calculate P_t, spaced repetition |
| **question_bank.py**   | Manage questions  | Filter, sample by difficulty     |
| **user_service.py**    | User CRUD         | Create, get, update users        |
| **session_manager.py** | Session flow      | Create, submit answers, complete |

---

## 🎨 Frontend Structure

### **Root: `satguide_demo/frontend/src/`**

```
src/
├── app/
│   ├── page.tsx                   # Home (shows onboarding)
│   ├── layout.tsx                 # Root layout
│   ├── globals.css                # Global styles
│   │
│   ├── pages/
│   │   └── OnboardingPage.tsx     # Onboarding wrapper
│   │
│   └── dashboard/
│       └── page.tsx               # Main dashboard
│
├── components/
│   ├── ui/                        # Shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── form.tsx
│   │   └── ...
│   │
│   └── domain/                    # Feature components
│       ├── StudyPlanForm.tsx      # Onboarding form
│       ├── MasteryGauge.tsx       # Circular progress gauge
│       ├── WeakAreasCard.tsx      # Top 5 weak topics
│       └── QuickStatsCard.tsx     # Daily/weekly stats
│
└── lib/
    ├── api.ts                     # API client (typed functions)
    ├── types.ts                   # TypeScript types
    ├── storage.ts                 # localStorage utilities
    └── utils.ts                   # Helper functions
```

### **Key Frontend Files**

| File                   | Purpose           | What's Inside                          |
| ---------------------- | ----------------- | -------------------------------------- |
| **page.tsx** (root)    | Landing page      | Shows OnboardingPage                   |
| **dashboard/page.tsx** | Main dashboard    | Progress, recommendations, stats       |
| **StudyPlanForm.tsx**  | Onboarding        | Collects scores, creates user          |
| **MasteryGauge.tsx**   | Visual component  | Circular SVG gauge (0-100%)            |
| **WeakAreasCard.tsx**  | Shows weak topics | Top 5, ranked, with study buttons      |
| **QuickStatsCard.tsx** | Study stats       | Questions, streak, time, topics        |
| **api.ts**             | Backend calls     | userAPI, recommendationAPI, sessionAPI |
| **types.ts**           | Type definitions  | Matches backend schemas                |
| **storage.ts**         | localStorage      | Save/get user_id                       |

---

## 🔄 Data Flow

### **User Creation (Onboarding)**

```
StudyPlanForm.tsx
  ↓ (form submit)
api.ts → userAPI.createUser()
  ↓ (POST /api/v1/users)
routes.py → user_service.create_user_profile()
  ↓
learning_model.initialize_masteries()
  ↓ (30 topics initialized)
Response → UserProfile
  ↓
storage.ts → saveUserToStorage(user_id)
  ↓
Navigate to /dashboard
```

### **Dashboard Load**

```
dashboard/page.tsx (useEffect)
  ↓ (parallel calls)
├─→ userAPI.getUserProgress()      → GET /users/{id}/progress
├─→ recommendationAPI.getNextTopic() → POST /recommendations/next
└─→ recommendationAPI.getTopTopics() → GET /recommendations/{id}/top-topics
  ↓ (200-300ms)
setState → render components
```

---

## 🧮 Algorithm Files (Backend)

### **Part 1: Scoring Engine** (`scoring_engine.py`)

**Purpose**: Score each question answer (0 to 1.1)

**Algorithm**:

```python
S_perf = clamp(S_base × F_time + M_conf, 0, 1.1)

Where:
- S_base: 0.9 (easy) | 1.0 (medium) | 1.1 (hard)
- F_time: Time penalty (0.75-1.0)
- M_conf: Confidence modifier (-0.4 to +0.1)
```

**Key Methods**:

- `calculate_performance_score()` - Main scoring function
- `calculate_base_score()` - Difficulty × correctness
- `calculate_time_factor()` - Speed penalty
- `calculate_confidence_modifier()` - Confidence impact

---

### **Part 2: Learning Model** (`learning_model.py`)

**Purpose**: Update topic mastery using EMA

**Algorithm**:

```python
M_t,new = α × S_perf + (1 - α) × M_t,old

Where:
- α = 0.1 (learning rate)
- S_perf: Question performance score
- M_t,old: Current mastery
```

**Key Methods**:

- `initialize_masteries()` - Create 30 topic masteries from SAT scores
- `update_mastery()` - Apply EMA after each answer
- `get_target_mastery()` - Calculate target from goal scores

---

### **Part 3: Dynamic Scheduler** (`scheduler.py`)

**Purpose**: Prioritize which topic to study next

**Algorithm**:

```python
P_t = (Mastery_Gap) × (Base_Weight) × (Forgetting_Factor)

Where:
- Mastery_Gap = 1 - M_t
- Base_Weight = Topic importance (0.7-1.0)
- Forgetting_Factor = ln(days + 1) + 1
```

**Key Methods**:

- `calculate_priority()` - Compute priority score
- `get_next_topic()` - Return highest priority topic
- `get_top_topics()` - Return top N by priority
- `calculate_forgetting_factor()` - Spaced repetition

---

## 📊 Data Models

### **Backend** (`schemas.py`)

**Main Models**:

- `UserProfile` - User with 30 topic masteries
- `TopicMastery` - Mastery score (0-1), last_studied, stats
- `AnswerSubmission` - User answer with confidence
- `QuestionPerformance` - Scored answer breakdown
- `StudySession` - Session with 10 questions
- `NextTopicRecommendation` - AI-selected next topic
- `TopicPriority` - Priority calculation details

**Enums**:

- `DifficultyLevel`: E, M, H
- `ConfidenceLevel`: apple, lemon, broccoli, ice_cube
- `Module`: math, english

---

### **Frontend** (`types.ts`)

**Same as backend** - Types mirror backend schemas for type safety.

---

## 🎯 API Endpoints

### **User Management**

```
POST   /api/v1/users                        Create user
GET    /api/v1/users/{user_id}              Get user
GET    /api/v1/users/{user_id}/progress     Get progress stats
GET    /api/v1/users/{user_id}/masteries    Get all masteries
```

### **Recommendations**

```
POST   /api/v1/recommendations/next         Get next topic
GET    /api/v1/recommendations/{id}/top-topics  Get weak areas
```

### **Study Sessions**

```
POST   /api/v1/sessions                     Create session
GET    /api/v1/sessions/{id}                Get session
POST   /api/v1/sessions/{id}/answers        Submit answer
POST   /api/v1/sessions/{id}/complete       Complete session
```

### **Questions**

```
GET    /api/v1/questions/{id}               Get question
GET    /api/v1/questions/filter/topic/{topic}  Filter questions
```

### **Topics**

```
GET    /api/v1/topics                       Get all topics
GET    /api/v1/topics/{module}              Get math or english
```

---

## 🗄️ Database

**Current**: In-memory dictionaries (Python dicts)

**Location**:

- Users: `user_service.py → self.users = {}`
- Sessions: `session_manager.py → self.sessions = {}`

**Future**: PostgreSQL/MongoDB (easy migration via service layer)

---

## 🎨 UI Components

### **Shadcn/ui** (`components/ui/`)

Pre-built, accessible components:

- Button, Card, Form, Input, Calendar, etc.

### **Domain Components** (`components/domain/`)

Feature-specific components:

- `StudyPlanForm` - Onboarding
- `MasteryGauge` - Visual gauge
- `WeakAreasCard` - Weak topics list
- `QuickStatsCard` - Stats grid

---

## 🔑 Environment Variables

### **Backend**: `backend/.env`

```bash
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000
```

### **Frontend**: `frontend/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📦 Dependencies

### **Backend** (`requirements.txt`)

- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `python-dotenv` - Environment variables

### **Frontend** (`package.json`)

- `next` - React framework
- `react` - UI library
- `tailwindcss` - Styling
- `shadcn/ui` - Component library
- `zod` - Schema validation
- `react-hook-form` - Form handling

---

## 🚀 Quick Start Commands

### **Backend**

```bash
cd satguide_demo/backend
pip install -r requirements.txt
python3 -m app.main
# Runs on http://localhost:8000
```

### **Frontend**

```bash
cd satguide_demo/frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 📝 File Naming Conventions

### **Backend**

- `snake_case.py` - Python files
- `lowercase` - Folders

### **Frontend**

- `PascalCase.tsx` - React components
- `camelCase.ts` - Utilities
- `kebab-case/` - Folders (Next.js routes)

---

## 🎓 What's Implemented

### ✅ Phase 1: Onboarding

- Form to collect scores and test date
- User creation API integration
- localStorage persistence
- Navigation to dashboard

### ✅ Phase 2: Dashboard

- Progress overview (4 stat cards)
- AI recommendation with mastery gauge
- Weak areas (top 5 topics)
- Quick stats (questions, streak, time)
- Study tips

### 🚧 Phase 3: Study Session (Next)

- Question display
- Answer choices
- Confidence picker (🍎🍋🥦🧊)
- Real-time feedback
- Session completion

---

## 🔍 Finding Things

### "Where is the scoring algorithm?"

→ `backend/app/services/scoring_engine.py`

### "Where does it calculate priority?"

→ `backend/app/services/scheduler.py`

### "Where is the dashboard?"

→ `frontend/src/app/dashboard/page.tsx`

### "Where is the API client?"

→ `frontend/src/lib/api.ts`

### "Where are the questions?"

→ `backend/data/question_bank.json`

### "Where do I add a new API endpoint?"

→ `backend/app/api/routes.py`

### "Where do I add a new component?"

→ `frontend/src/components/domain/`

---

## 🐛 Common Issues

**Backend won't start**: Check Python version (need 3.9+)  
**Frontend won't build**: Run `npm install`  
**CORS errors**: Check `.env.local` has correct API URL  
**API 500 errors**: Check backend terminal for stack trace  
**Types don't match**: Sync `types.ts` with `schemas.py`

---

**Version**: 2.0  
**Last Updated**: Phase 2 Complete  
**Total Files**: ~30 files  
**Total Lines**: ~3,500 lines
