read buyan's md <a href="buyan.md">here</a>

# SAT Prep Platform

A modern web application for SAT test preparation built with Next.js and FastAPI.

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

### Backend (.env)

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase service role key
- `API_HOST` - API host (default: 0.0.0.0)
- `API_PORT` - API port (default: 8000)
- `CORS_ORIGINS` - Allowed CORS origins

## License

MIT
