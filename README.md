# Prep St

AI-powered test preparation platform with personalized study plans that adapt to student weaknesses.

## 🎯 MVP Features - Study Planner (Implemented)

✅ **Study Plan Generation**

- Input current/target scores (Math & Reading/Writing)
- Set test date
- Auto-generate personalized study schedule
- Topic distribution based on category weights (Algebra 35%, etc.)
- Daily practice sessions with specific topics and question counts

✅ **Backend API**

- FastAPI with Supabase PostgreSQL
- Study plan generation algorithm
- Topic taxonomy (19 Math + 11 Reading/Writing topics)
- RESTful endpoints for plan management

✅ **Frontend UI**

- Onboarding form for score input
- Study plan calendar view
- Session breakdown by day
- Responsive design with shadcn/ui

## 🚀 Coming Next

- Question Generation & Practice Sessions
- Mock Tests
- Adaptive Plan Updates

## Tech Stack

### Frontend

- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (latest)
- **React**

### Backend

- **FastAPI**
- **Supabase**
- **Python 3.10+**

## Project Structure

```
sat/
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── package.json       # Root package.json for monorepo
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Python 3.10+

### Installation

1. **Install root dependencies**

   ```bash
   pnpm install
   ```

2. **Set up Frontend**

   ```bash
   cd frontend
   cp .env.example .env.local
   # Edit .env.local with your configuration
   pnpm install
   ```

3. **Set up Backend**

   ```bash
   cd backend

   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   # venv\Scripts\activate

   # Install dependencies
   pip install -r requirements.txt

   # Set up environment variables
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

### Running the Development Servers

#### Option 1: Run both servers from root

```bash
# From root directory
pnpm dev
```

#### Option 2: Run servers individually

**Frontend:**

```bash
pnpm dev:frontend
# or
cd frontend && pnpm dev
```

**Backend:**

```bash
pnpm dev:backend
# or
cd backend && source venv/bin/activate && pnpm dev
```

### Access the Applications

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## Available Scripts

From the root directory:

- `pnpm dev` - Run both frontend and backend in parallel
- `pnpm dev:frontend` - Run only frontend
- `pnpm dev:backend` - Run only backend
- `pnpm build` - Build both applications
- `pnpm lint` - Lint both applications

### Type Generation

The frontend uses auto-generated TypeScript types from the backend OpenAPI specification:

```bash
# Generate TypeScript types from backend OpenAPI
cd frontend
pnpm generate:api-types
```

**When to regenerate types:**
- After changing Pydantic models in `backend/app/models/`
- After adding/modifying API endpoints
- After updating response structures

**Requirements:**
- Backend must be running on `http://localhost:8000`
- Uses `openapi-typescript` to generate types from `/openapi.json` endpoint

Generated types are saved to `frontend/lib/types/api.generated.ts` and re-exported through `frontend/lib/types/index.ts`.

## Adding Turborepo (Optional)

To add Turborepo for better monorepo management:

```bash
pnpm add -Dw turbo
```

Then create `turbo.json` in the root directory.

## Environment Variables

### Frontend (.env.local)

- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

### Backend (.env.local)

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `API_HOST` - API host (default: 0.0.0.0)
- `API_PORT` - API port (default: 8000)
- `CORS_ORIGINS` - Allowed CORS origins

## 📊 Study Planner Algorithm

The study plan generation works as follows:

1. **Calculate Practice Volume**

   - Base: 20 questions/day
   - Adjusted based on score gaps and days available
   - Capped between 15-40 questions/day

2. **Distribute by Category Weights**

   - Math: Algebra (35%), Advanced Math (35%), Problem-Solving (15%), Geometry (15%)
   - Reading/Writing: 4 categories at 25% each
   - Equal distribution within each category

3. **Group Into Sessions**

   - Related topics grouped together
   - ~20-40 questions per session
   - Interleave Math and R/W for variety

4. **Schedule Across Days**
   - Evenly distributed from start date to test date
   - Multiple sessions per day based on volume

## 🗃️ Database Schema

See [backend/supabase/migrations/](backend/supabase/migrations/) for complete schema.

**Key Tables:**

- `categories` - SAT categories with weights
- `topics` - Granular topics within categories
- `study_plans` - User study plans
- `practice_sessions` - Scheduled practice sessions
- `session_topics` - Topics assigned to each session

## 🧪 Testing the Application

1. **Run migrations** in Supabase SQL Editor:

   - `backend/supabase/migrations/001_initial_schema.sql`
   - `backend/supabase/migrations/002_seed_topics.sql`

2. **Start both servers**: `pnpm dev`

3. **Test flow**:
   - Visit http://localhost:3000
   - Click "Get Started"
   - Enter scores (e.g., Math: 500→700, R/W: 520→680)
   - Set test date (future date)
   - View generated study plan

## License

MIT
