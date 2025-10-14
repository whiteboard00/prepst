from openai import OpenAI
from app.config import get_settings
from typing import Dict, List, Any, Optional
import json

settings = get_settings()


class OpenAIService:
    """Service for generating AI-powered feedback using OpenAI API"""
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.max_tokens = settings.openai_max_tokens
    
    def _build_feedback_prompt(
        self,
        question_stem: str,
        question_type: str,
        correct_answer: List[str],
        user_answer: List[str],
        is_correct: bool,
        rationale: Optional[str],
        topic_name: str,
        user_performance_context: Dict[str, Any]
    ) -> str:
        """Build a comprehensive prompt for feedback generation"""
        
        # Format answers for display
        correct_answer_str = ", ".join(str(a) for a in correct_answer)
        user_answer_str = ", ".join(str(a) for a in user_answer) if user_answer else "No answer provided"
        
        # Build performance context string
        perf_context = ""
        if user_performance_context:
            topic_correct = user_performance_context.get('topic_correct', 0)
            topic_total = user_performance_context.get('topic_total', 0)
            if topic_total > 0:
                perf_context = f"\n\nStudent's Performance Context:\n- This topic ({topic_name}): {topic_correct}/{topic_total} correct ({int(topic_correct/topic_total*100)}%)"
        
        prompt = f"""You are an expert SAT tutor providing personalized feedback to help students improve.

Question Topic: {topic_name}
Question Type: {"Multiple Choice" if question_type == "mc" else "Student Produced Response"}

Question:
{question_stem}

Correct Answer: {correct_answer_str}
Student's Answer: {user_answer_str}
Result: {"Correct ✓" if is_correct else "Incorrect ✗"}
{perf_context}

{"Official Rationale: " + rationale if rationale else ""}

Please provide feedback in the following JSON format:
{{
    "explanation": "A clear, concise explanation of why the answer is correct/incorrect. Focus on the reasoning and concepts.",
    "hints": ["Hint 1", "Hint 2", "Hint 3"],
    "learning_points": ["Key concept 1", "Key concept 2", "Key concept 3"],
    "key_concepts": ["Concept name 1", "Concept name 2"]
}}

Guidelines:
1. **Explanation**: {"Explain why the student's approach was correct and reinforce the concept." if is_correct else "Identify where the student went wrong without giving away the full solution. Be encouraging."}
2. **Hints**: {"Provide 2-3 additional insights or related concepts to strengthen understanding." if is_correct else "Provide 3-4 strategic hints to guide the student toward the correct approach."}
3. **Learning Points**: List 3-4 key takeaways the student should remember for similar questions.
4. **Key Concepts**: List 2-3 SAT concepts/topics covered in this question.

Be supportive, educational, and concise. Use language appropriate for high school students."""

        return prompt
    
    def _parse_feedback_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the OpenAI response into structured feedback"""
        try:
            # Try to parse as JSON
            feedback = json.loads(response_text)
            
            # Validate required fields
            required_fields = ['explanation', 'hints', 'learning_points', 'key_concepts']
            for field in required_fields:
                if field not in feedback:
                    feedback[field] = [] if field != 'explanation' else "No explanation provided"
            
            # Ensure lists
            for field in ['hints', 'learning_points', 'key_concepts']:
                if not isinstance(feedback[field], list):
                    feedback[field] = [str(feedback[field])]
            
            return feedback
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "explanation": response_text[:300] + "..." if len(response_text) > 300 else response_text,
                "hints": [],
                "learning_points": [],
                "key_concepts": []
            }
    
    async def generate_answer_feedback(
        self,
        question_stem: str,
        question_type: str,
        correct_answer: List[str],
        user_answer: List[str],
        is_correct: bool,
        rationale: Optional[str],
        topic_name: str,
        user_performance_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate personalized feedback using OpenAI"""
        
        # Build the prompt
        prompt = self._build_feedback_prompt(
            question_stem, question_type, correct_answer,
            user_answer, is_correct, rationale, topic_name,
            user_performance_context
        )
        
        # Call OpenAI API
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert SAT tutor who provides clear, concise, and encouraging feedback. Always respond with valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            # Parse and return feedback
            feedback_text = response.choices[0].message.content
            feedback = self._parse_feedback_response(feedback_text)
            
            return feedback
            
        except Exception as e:
            # Return error feedback if API call fails
            print(f"OpenAI API Error: {str(e)}")
            return {
                "explanation": f"Unable to generate AI feedback at this time. {str(e)[:100]}",
                "hints": [],
                "learning_points": [],
                "key_concepts": []
            }


# Global instance
openai_service = OpenAIService()

