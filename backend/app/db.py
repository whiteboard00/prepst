from supabase import create_client, Client
from app.config import get_settings
from functools import lru_cache


@lru_cache()
def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.
    Cached to reuse the same client across requests.
    """
    settings = get_settings()
    supabase: Client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key
    )
    return supabase


def get_db() -> Client:
    """
    Dependency function for FastAPI endpoints.
    Returns the Supabase client.
    """
    return get_supabase_client()
