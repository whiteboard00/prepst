from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import Client
from app.db import get_db
from app.core.auth import get_current_user
from typing import Dict

router = APIRouter(prefix="/auth", tags=["auth"])


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user: Dict
    session: Dict


@router.post("/signup", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def sign_up(
    signup_data: SignUpRequest,
    db: Client = Depends(get_db)
):
    """
    Register a new user.

    Args:
        signup_data: Email and password
        db: Supabase client

    Returns:
        User and session data
    """
    try:
        response = db.auth.sign_up({
            "email": signup_data.email,
            "password": signup_data.password,
        })

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )

        return {
            "user": {
                "id": response.user.id,
                "email": response.user.email,
            },
            "session": {
                "access_token": response.session.access_token if response.session else None,
                "refresh_token": response.session.refresh_token if response.session else None,
            } if response.session else None,
            "message": "User created successfully. Please check your email for verification."
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/signin", response_model=Dict)
async def sign_in(
    signin_data: SignInRequest,
    db: Client = Depends(get_db)
):
    """
    Sign in an existing user.

    Args:
        signin_data: Email and password
        db: Supabase client

    Returns:
        User and session data with tokens
    """
    try:
        response = db.auth.sign_in_with_password({
            "email": signin_data.email,
            "password": signin_data.password,
        })

        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        return {
            "user": {
                "id": response.user.id,
                "email": response.user.email,
            },
            "session": {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )


@router.post("/signout")
async def sign_out(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Sign out the current user.

    Args:
        user_id: Current user ID from auth token
        db: Supabase client

    Returns:
        Success message
    """
    try:
        db.auth.sign_out()
        return {"message": "Signed out successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sign out: {str(e)}"
        )


@router.get("/me", response_model=Dict)
async def get_current_user_info(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get current user information.

    Args:
        user_id: Current user ID from auth token
        db: Supabase client

    Returns:
        User profile data
    """
    try:
        response = db.table("users").select("*").eq("id", user_id).single().execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return response.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user: {str(e)}"
        )
