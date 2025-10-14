from pydantic_settings import BaseSettings
from pydantic import Field
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
    
    # OpenAI
    openai_api_key: str = Field(default="", env="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", env="OPENAI_MODEL")
    openai_max_tokens: int = Field(default=500, env="OPENAI_MAX_TOKENS")

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields


@lru_cache()
def get_settings():
    return Settings()
