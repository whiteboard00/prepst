from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from pathlib import Path
from app.services.manim_service import ManimService
from app.core.auth import get_current_user
import os
import json

router = APIRouter(prefix="/visual-explanation", tags=["visual-explanation"])

manim_service = ManimService()


class VisualExplanationRequest(BaseModel):
    question: str
    conversation_history: Optional[List[Dict[str, Any]]] = None


class VisualExplanationResponse(BaseModel):
    success: bool
    explanation: str
    video_url: Optional[str] = None
    manim_code: Optional[str] = None
    error: Optional[str] = None


@router.post("/generate", response_model=VisualExplanationResponse)
async def generate_visual_explanation(
    request: VisualExplanationRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Generate a visual explanation using Manim animations.

    Args:
        request: Request with question and optional conversation history
        user_id: User ID from authentication token

    Returns:
        Visual explanation with video URL and explanation text
    """
    try:
        # Generate Manim code
        manim_code = manim_service.generate_manim_code(
            question=request.question,
            conversation_history=request.conversation_history
        )

        # Execute Manim code to create animation
        result = manim_service.execute_manim_code(manim_code, question=request.question)

        # Generate explanation text
        explanation = manim_service.generate_explanation_text(
            question=request.question,
            manim_code=manim_code
        )

        return VisualExplanationResponse(
            success=True,
            explanation=explanation,
            video_url=result.get("video_url"),
            manim_code=result.get("manim_code")
        )

    except Exception as e:
        print(f"Error generating visual explanation: {str(e)}")
        
        # Try to generate explanation text even if Manim fails
        try:
            explanation = manim_service.generate_explanation_text(request.question)
        except:
            explanation = f"I apologize, but I encountered an issue generating the visual explanation for: {request.question}"
        
        return VisualExplanationResponse(
            success=False,
            explanation=explanation,
            error=str(e)
        )


class VideoListItem(BaseModel):
    id: str
    video_url: str
    filename: str
    created_at: str


@router.get("/videos", response_model=List[VideoListItem])
async def list_videos(
    user_id: str = Depends(get_current_user),
):
    """
    List all existing video files in the manim_output directory.
    
    Returns:
        List of video files with their URLs and metadata
    """
    try:
        videos = []
        output_dir = manim_service.output_dir
        
        if not output_dir.exists():
            return []
        
        # Search for all mp4 files recursively, but EXCLUDE partial_movie_files
        all_mp4s = list(output_dir.rglob("*.mp4"))
        # Filter out partial movie files - these are fragments, not final videos
        video_files = [
            f for f in all_mp4s 
            if "partial_movie_files" not in str(f)
        ]
        
        for video_file in video_files:
            # Get relative path from output_dir
            relative_path = video_file.relative_to(output_dir)
            video_url = f"/static/manim/{relative_path.as_posix()}"
            
            # Use filename or path as ID
            video_id = video_file.stem  # filename without extension
            
            # Try to load metadata file if it exists
            metadata_path = video_file.with_suffix(".json")
            question_text = video_file.stem.replace("_", " ").replace("-", " ")  # Fallback to filename
            created_at = os.path.getmtime(video_file)
            
            if metadata_path.exists():
                try:
                    with open(metadata_path, "r") as f:
                        metadata = json.load(f)
                        question_text = metadata.get("question", question_text)
                        if "created_at" in metadata:
                            created_at = metadata["created_at"]
                except Exception as e:
                    print(f"Failed to load metadata for {video_file.name}: {e}")
            
            from datetime import datetime
            created_at_str = datetime.fromtimestamp(created_at).isoformat()
            
            videos.append(VideoListItem(
                id=video_id,
                video_url=video_url,
                filename=question_text,  # Use question as filename display
                created_at=created_at_str
            ))
        
        # Sort by creation time (newest first)
        videos.sort(key=lambda x: x.created_at, reverse=True)
        
        return videos
        
    except Exception as e:
        print(f"Error listing videos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list videos: {str(e)}"
        )

