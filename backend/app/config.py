from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True

    # CORS
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env.local"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields


@lru_cache()
def get_settings():
    return Settings()
