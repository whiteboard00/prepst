from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.api.routes import router

# Load environment variables
load_dotenv()

app = FastAPI(
    title="SAT Prep API",
    description="Backend API for SAT test preparation platform with adaptive learning",
    version="1.0.0"
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.get("/")
async def root():
    return {
        "message": "SAT Prep API is running",
        "version": "1.0.0",
        "features": [
            "Adaptive learning algorithm",
            "Dynamic question difficulty",
            "Spaced repetition",
            "Performance scoring with confidence tracking",
            "Topic mastery management"
        ]
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))

    uvicorn.run("app.main:app", host=host, port=port, reload=True)
