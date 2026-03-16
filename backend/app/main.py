from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
import time
import logging
from app.api import study_plans, practice_sessions, auth, mock_exams, analytics, profile, ai_feedback, diagnostic_test, admin_questions, manim, webhooks, questions, vocabulary, courses
from app.config import get_settings

settings = get_settings()

# Configure logging - suppress httpx logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger(__name__)

# Suppress verbose httpx logs
logging.getLogger("httpx").setLevel(logging.WARNING)

app = FastAPI(
    title="Prep St API",
    description="Backend API for Prep St — AI-powered learning platform",
    version="0.2.0"
)

# Configure CORS
origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]

# Log CORS configuration for debugging
logger.info(f"CORS origins configured: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    # Log request with origin for CORS debugging
    origin = request.headers.get("origin", "no-origin")
    print(f"→ {request.method} {request.url.path} [Origin: {origin}]", flush=True)
    if request.query_params:
        print(f"  Query params: {dict(request.query_params)}", flush=True)

    # Process request
    response = await call_next(request)

    # Log response
    duration = (time.time() - start_time) * 1000
    print(f"← {response.status_code} {request.url.path} ({duration:.2f}ms)", flush=True)

    return response


# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(study_plans.router, prefix="/api")
app.include_router(practice_sessions.router, prefix="/api")
app.include_router(mock_exams.router, prefix="/api")
app.include_router(diagnostic_test.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(ai_feedback.router, prefix="/api")
app.include_router(admin_questions.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(vocabulary.router, prefix="/api")

# Include manim router
# If MANIM_SERVICE_URL is set (Vercel), manim router will proxy requests to Railway
# If not set (Railway), manim router handles requests locally with full manim capabilities
app.include_router(manim.router, prefix="/api")

app.include_router(webhooks.router, prefix="/api")
app.include_router(courses.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Prep St API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("API_HOST", "0.0.0.0")
    # Railway uses PORT, fallback to API_PORT
    port = int(os.getenv("PORT") or os.getenv("API_PORT", 8000))

    uvicorn.run("app.main:app", host=host, port=port, reload=True)
