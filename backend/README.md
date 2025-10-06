# SAT Prep Backend API

FastAPI backend for the SAT prep platform.

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_or_service_key
```

### 4. Run Database Migrations

In your Supabase project dashboard:

1. Go to SQL Editor
2. Run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_topics.sql`

## Running the Server

### Development Mode

```bash
# From backend directory
python -m uvicorn app.main:app --reload

# Or use pnpm from root
pnpm dev:backend
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### Study Plans

#### Generate Study Plan
```http
POST /api/study-plans/generate?user_id={user_id}
Content-Type: application/json

{
  "current_math_score": 500,
  "target_math_score": 700,
  "current_rw_score": 520,
  "target_rw_score": 680,
  "test_date": "2025-05-01"
}
```

#### Get Study Plan
```http
GET /api/study-plans/{user_id}
```

#### Get Categories and Topics
```http
GET /api/study-plans/
```

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── study_plans.py       # Study plan endpoints
│   ├── models/
│   │   └── study_plan.py        # Pydantic models
│   ├── services/
│   │   └── study_plan_service.py # Business logic
│   ├── config.py                 # Configuration
│   ├── db.py                     # Supabase client
│   └── main.py                   # FastAPI app
├── supabase/
│   └── migrations/               # SQL migrations
│       ├── 001_initial_schema.sql
│       └── 002_seed_topics.sql
├── requirements.txt
└── .env.local                    # Your credentials (not in git)
```

## Testing

You can test the API using:
- **Swagger UI**: http://localhost:8000/docs
- **cURL**:
  ```bash
  curl -X POST "http://localhost:8000/api/study-plans/generate?user_id=test-user" \
    -H "Content-Type: application/json" \
    -d '{
      "current_math_score": 500,
      "target_math_score": 700,
      "current_rw_score": 520,
      "target_rw_score": 680,
      "test_date": "2025-05-01"
    }'
  ```

## Study Plan Algorithm

The study plan generation algorithm:

1. **Calculate total questions** based on:
   - Days until test
   - Score improvement goals
   - Base: 20 questions/day + adjustments for score gaps

2. **Distribute questions by topic**:
   - Respects category weights (Algebra 35%, Advanced Math 35%, etc.)
   - Equal distribution within each category

3. **Group into sessions**:
   - ~20-40 questions per session
   - Related topics grouped together

4. **Schedule across days**:
   - Evenly distributed from start_date to test_date
   - Interleaves Math and Reading/Writing for variety

## TODO

- [ ] Add authentication (Supabase Auth)
- [ ] Add adaptive plan updates based on performance
- [ ] Add error logging
- [ ] Add unit tests
