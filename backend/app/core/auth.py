from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client, create_client
from app.db import get_db
from app.config import get_settings
from typing import Optional, Tuple

security = HTTPBearer()


async def get_current_user_and_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db)
) -> Tuple[str, str]:
    """
    Extract and verify the user ID and token from the JWT token.

    Args:
        credentials: Bearer token from request header
        db: Supabase client

    Returns:
        Tuple of (user_id, token)

    Raises:
        HTTPException: If token is invalid or user not found
    """
    try:
        token = credentials.credentials

        # Verify the token and get user
        user_response = db.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user_response.user.id, token

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    user_and_token: Tuple[str, str] = Depends(get_current_user_and_token)
) -> str:
    """
    Extract user ID from the token.

    Args:
        user_and_token: Tuple of (user_id, token)

    Returns:
        User ID from the token
    """
    return user_and_token[0]


async def get_authenticated_client(
    user_and_token: Tuple[str, str] = Depends(get_current_user_and_token)
) -> Client:
    """
    Get a Supabase client with the user's auth token set.
    This ensures RLS policies work correctly.

    Args:
        user_and_token: Tuple of (user_id, token)

    Returns:
        Supabase client with auth context
    """
    settings = get_settings()
    user_id, token = user_and_token

    # Create a new client instance with the user's token
    client = create_client(settings.supabase_url, settings.supabase_anon_key)

    # Set the auth token for this client
    client.postgrest.auth(token)

    return client


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Client = Depends(get_db)
) -> Optional[str]:
    """
    Extract user ID from JWT token if present, otherwise return None.
    Used for endpoints that can work with or without authentication.

    Args:
        credentials: Bearer token from request header (optional)
        db: Supabase client

    Returns:
        User ID from the token or None
    """
    if not credentials:
        return None

    try:
        token = credentials.credentials
        user_response = db.auth.get_user(token)

        if not user_response or not user_response.user:
            return None

        return user_response.user.id

    except Exception:
        return None
