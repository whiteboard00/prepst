import subprocess
import tempfile
import os
import json
from pathlib import Path
from typing import Dict, Optional
import uuid
from app.services.openai_service import OpenAIService
from app.config import get_settings

settings = get_settings()
openai_service = OpenAIService()


class ManimService:
    """Service for generating Manim animations from questions"""

    def __init__(self):
        # Use absolute path relative to backend directory
        backend_dir = Path(__file__).parent.parent.parent
        self.output_dir = backend_dir / "manim_output"
        self.output_dir.mkdir(exist_ok=True)

    def generate_manim_code(self, question: str, conversation_history: Optional[list] = None) -> str:
        """Generate Manim code using OpenAI based on the question"""
        
        # Build context from conversation history
        context = ""
        if conversation_history:
            context = "\n\nPrevious conversation:\n"
            for msg in conversation_history[-3:]:  # Last 3 messages for context
                context += f"{msg.get('role', 'user')}: {msg.get('content', '')}\n"

        prompt = f"""You are an expert at creating educational animations using Manim Community Edition.

The user wants a visual explanation for: {question}

{context}

Generate Python code using Manim Community Edition that creates an educational animation explaining this concept.

CRITICAL REQUIREMENTS:
1. Use Manim Community Edition (import manim)
2. Create a Scene class that inherits from Scene
3. DO NOT use MathTex, Tex, or any LaTeX-based text rendering - these require LaTeX installation
4. Use Text() or MarkupText() for all text labels and explanations instead
5. Make the animation clear, educational, and visually appealing
6. Include text labels and explanations using Text() only
7. Keep animations under 30 seconds
8. Use appropriate colors and animations
9. Make sure the code is complete and runnable

IMPORTANT: Never use MathTex, Tex, or any LaTeX functions. Always use Text() or MarkupText() for text.

Return ONLY the Python code, no markdown formatting, no explanations, just the code.
The Scene class should be named appropriately (e.g., ExplanationScene, MathVisualization, etc.)

Example structure:
```python
from manim import *

class ExplanationScene(Scene):
    def construct(self):
        # Use Text() for all text, never MathTex or Tex
        title = Text("Title", font_size=48)
        self.play(Write(title))
        # Your animation code here
        pass
```

Now generate the Manim code:"""

        try:
            response = openai_service.client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert Manim Community Edition developer. Generate complete, runnable Python code for educational animations. CRITICAL: Never use MathTex, Tex, or any LaTeX functions. Always use Text() or MarkupText() for all text rendering."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )

            code = response.choices[0].message.content.strip()
            
            # Remove markdown code blocks if present
            if code.startswith("```python"):
                code = code[9:]
            if code.startswith("```"):
                code = code[3:]
            if code.endswith("```"):
                code = code[:-3]
            
            return code.strip()
        except Exception as e:
            raise Exception(f"Failed to generate Manim code: {str(e)}")

    def _validate_code(self, code: str) -> None:
        """Validate that code doesn't use LaTeX-dependent functions"""
        forbidden_patterns = [
            r'MathTex\s*\(',
            r'Tex\s*\(',
            r'SingleStringMathTex\s*\(',
            r'LaTeX\s*\(',
        ]
        
        import re
        for pattern in forbidden_patterns:
            if re.search(pattern, code):
                raise Exception(
                    f"Generated code uses LaTeX-dependent function (MathTex/Tex). "
                    f"Please regenerate with Text() or MarkupText() instead."
                )

    def execute_manim_code(self, code: str, question: Optional[str] = None) -> Dict[str, str]:
        """Execute Manim code and return video path"""
        
        # Create a temporary file for the Manim script
        script_id = str(uuid.uuid4())
        script_path = self.output_dir / f"scene_{script_id}.py"
        
        try:
            # Write code to file
            with open(script_path, "w") as f:
                f.write(code)
            
            # Validate code doesn't use LaTeX
            self._validate_code(code)
            
            # Extract scene class name from code
            scene_class = self._extract_scene_class(code)
            if not scene_class:
                raise Exception("Could not find Scene class in generated code")
            
            # Render the animation
            # Manim outputs to a videos subdirectory, so we'll use the script directory
            script_dir = script_path.parent
            
            # Run Manim command
            # Manim creates videos in videos/{quality}/{scene_name}.mp4
            cmd = [
                "manim",
                "-ql",  # Low quality for faster rendering (480p15)
                str(script_path),
                scene_class
            ]
            
            # Change to script directory so Manim outputs relative to it
            original_cwd = os.getcwd()
            try:
                os.chdir(str(script_dir))
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=120  # 2 minute timeout
                )
            finally:
                os.chdir(original_cwd)
            
            if result.returncode != 0:
                error_msg = result.stderr or result.stdout or "Unknown error"
                # Provide more helpful error messages
                if "latex" in error_msg.lower() or "FileNotFoundError" in error_msg:
                    raise Exception(
                        "Manim execution failed: LaTeX is required but not installed. "
                        "The generated code attempted to use MathTex/Tex. "
                        "Please try regenerating the explanation."
                    )
                # Include both stdout and stderr for debugging
                full_error = f"STDOUT: {result.stdout}\nSTDERR: {result.stderr}" if result.stdout else result.stderr
                raise Exception(f"Manim execution failed: {full_error[:1000]}")
            
            # Manim outputs videos in media/videos/{script_name}/{quality}/{scene_name}.mp4
            # For -ql (low quality), it's typically media/videos/scene_{script_id}/480p15/{SceneClass}.mp4
            # We need to find the final video, NOT partial_movie_files
            # Manim uses the script filename (without .py) as the directory name
            
            script_name = script_path.stem  # e.g., "scene_b4a13d2e-b19f-42ee-9ef0-165faa604d60"
            
            # Search paths - Manim creates media/videos structure relative to where script is run
            video_search_paths = [
                script_dir / "media" / "videos" / script_name / "480p15",  # New structure (low quality)
                script_dir / "media" / "videos" / script_name / "720p30",  # Medium quality
                script_dir / "media" / "videos" / script_name / "1080p60",  # High quality
                self.output_dir / "media" / "videos" / script_name / "480p15",  # Absolute path
                script_dir / "videos" / "480p15",  # Old structure
                script_dir / "videos" / "720p30",  # Old structure medium quality
                self.output_dir / script_id,  # Very old location
                script_dir,  # Direct in script directory
            ]
            
            video_files = []
            for search_path in video_search_paths:
                if search_path.exists():
                    # Find mp4 files, but EXCLUDE partial_movie_files directory
                    all_mp4s = list(search_path.rglob("*.mp4"))
                    # Filter out partial movie files
                    final_videos = [
                        f for f in all_mp4s 
                        if "partial_movie_files" not in str(f)
                    ]
                    if final_videos:
                        video_files = final_videos
                        break
            
            # If still not found, search more broadly but exclude partial files
            if not video_files:
                # Search in media/videos structure more broadly
                media_videos_dir = script_dir / "media" / "videos"
                if media_videos_dir.exists():
                    all_mp4s = list(media_videos_dir.rglob("*.mp4"))
                    final_videos = [
                        f for f in all_mp4s 
                        if "partial_movie_files" not in str(f)
                        and f.parent.name in ["480p15", "720p30", "1080p60"]  # Only quality folders
                    ]
                    if final_videos:
                        # Get the most recent one (should be the one we just created)
                        video_files = sorted(final_videos, key=lambda x: x.stat().st_mtime, reverse=True)[:1]
            
            if not video_files:
                # List what files were actually created for debugging
                created_files = []
                for search_path in video_search_paths:
                    if search_path.exists():
                        created_files.extend([str(f) for f in search_path.rglob("*.mp4") if "partial_movie_files" not in str(f)])
                
                error_details = f"No final video file generated. Manim output: {result.stdout[:500] if result.stdout else 'No output'}"
                if created_files:
                    error_details += f"\nFiles found (excluding partials): {', '.join(created_files[:10])}"
                raise Exception(error_details)
            
            # Get the final video (should only be one, but take the first if multiple)
            video_path = video_files[0]
            
            # Save metadata file with question if provided
            if question:
                metadata_path = video_path.with_suffix(".json")
                metadata = {
                    "question": question,
                    "created_at": video_path.stat().st_mtime,
                    "video_filename": video_path.name
                }
                with open(metadata_path, "w") as f:
                    json.dump(metadata, f, indent=2)
            
            # Return URL path that matches the static mount
            # Static mount is at /static/manim, and videos are in subdirectories
            relative_path = video_path.relative_to(self.output_dir)
            video_url = f"/static/manim/{relative_path.as_posix()}"
            
            return {
                "video_path": str(video_path),
                "video_url": video_url,
                "manim_code": code
            }
            
        except subprocess.TimeoutExpired:
            raise Exception("Manim rendering timed out")
        except Exception as e:
            raise Exception(f"Failed to execute Manim code: {str(e)}")
        finally:
            # Clean up script file (keep video)
            if script_path.exists():
                pass  # Keep for debugging, can delete later

    def _extract_scene_class(self, code: str) -> Optional[str]:
        """Extract the Scene class name from code"""
        import re
        
        # Look for class definitions that inherit from Scene
        pattern = r'class\s+(\w+)\s*\([^)]*Scene[^)]*\)'
        match = re.search(pattern, code)
        
        if match:
            return match.group(1)
        
        # Fallback: look for any class definition
        pattern = r'class\s+(\w+)\s*\('
        match = re.search(pattern, code)
        
        return match.group(1) if match else None

    def generate_explanation_text(self, question: str, manim_code: Optional[str] = None) -> str:
        """Generate a text explanation to accompany the visualization"""
        
        prompt = f"""The user asked: {question}

Generate a brief, clear explanation (2-3 sentences) that will accompany a visual animation.
Keep it concise and educational."""

        try:
            response = openai_service.client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an educational assistant. Provide clear, concise explanations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=200
            )

            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"I've created a visual explanation for: {question}"

