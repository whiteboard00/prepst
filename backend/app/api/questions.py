"""
Question Pool API
Endpoints for browsing questions in the question bank (user-facing)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from app.core.auth import get_current_user, get_authenticated_client
from typing import List, Dict, Optional, Any
from pydantic import BaseModel


router = APIRouter(prefix="/questions", tags=["questions"])


class TopicQuestionCount(BaseModel):
    """Question count by topic"""
    topic_id: str
    topic_name: str
    category_id: str
    category_name: str
    section: str
    total_questions: int
    easy_count: int
    medium_count: int
    hard_count: int


class QuestionPoolResponse(BaseModel):
    """Response for question pool browse endpoint"""
    questions: List[Dict[str, Any]]
    total: int
    limit: int
    offset: int
    has_more: bool


@router.get("/browse")
async def browse_questions(
    section: Optional[str] = Query(None, description="Filter by section"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty (E/M/H)"),
    topic_id: Optional[str] = Query(None, description="Filter by topic ID"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    course_slug: Optional[str] = Query(None, description="Filter by course slug (e.g. sat, act)"),
    search: Optional[str] = Query(None, description="Search in question stem"),
    limit: int = Query(20, description="Number of results per page", ge=1, le=100),
    offset: int = Query(0, description="Offset for pagination", ge=0),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
) -> QuestionPoolResponse:
    """
    Browse questions from the question bank.
    User-facing endpoint (not admin).
    
    Returns active questions only with topic and category info.
    """
    try:
        # Resolve course_id from slug for filtering
        course_id = None
        if course_slug:
            course_result = db.table("courses").select("id").eq("slug", course_slug).execute()
            if course_result.data:
                course_id = course_result.data[0]["id"]

        # Build query - get active questions with topic info
        query = db.table('questions').select(
            'id, stem, stimulus, difficulty, question_type, answer_options, correct_answer, rationale, topic_id, '
            'topics!inner(id, name, category_id, categories!inner(id, name, section, course_id))'
        ).eq('is_active', True)

        # Apply course filter via join
        if course_id:
            query = query.eq('topics.categories.course_id', course_id)

        # Apply section filter via join
        if section:
            query = query.eq('topics.categories.section', section)
        
        # Apply difficulty filter
        if difficulty:
            query = query.eq('difficulty', difficulty)
        
        # Apply topic filter
        if topic_id:
            query = query.eq('topic_id', topic_id)
        
        # Apply category filter via join
        if category_id:
            query = query.eq('topics.category_id', category_id)
        
        # Apply search filter
        if search:
            search_pattern = f"%{search}%"
            query = query.ilike('stem', search_pattern)
        
        # Execute query with pagination
        result = query.order('difficulty').range(offset, offset + limit - 1).execute()
        questions = result.data
        
        # Transform questions for response
        formatted_questions = []
        for q in questions:
            topic = q.get('topics', {})
            category = topic.get('categories', {}) if topic else {}
            
            formatted_questions.append({
                'id': q['id'],
                'stem': q['stem'],
                'stimulus': q.get('stimulus'),
                'difficulty': q['difficulty'],
                'question_type': q['question_type'],
                'answer_options': q.get('answer_options'),
                'correct_answer': q.get('correct_answer'),
                'rationale': q.get('rationale'),
                'topic': {
                    'id': topic.get('id'),
                    'name': topic.get('name'),
                } if topic else None,
                'category': {
                    'id': category.get('id'),
                    'name': category.get('name'),
                    'section': category.get('section'),
                } if category else None,
            })
        
        # Get total count with same filters
        count_query = db.table('questions').select('id', count='exact').eq('is_active', True)
        
        if difficulty:
            count_query = count_query.eq('difficulty', difficulty)
        if topic_id:
            count_query = count_query.eq('topic_id', topic_id)
        if search:
            count_query = count_query.ilike('stem', f"%{search}%")
        
        # Note: section and category filters through joins work differently for count
        # For simplicity, use length of filtered results as approximate count
        count_result = count_query.execute()
        total_count = count_result.count if hasattr(count_result, 'count') and count_result.count else len(count_result.data)
        
        return QuestionPoolResponse(
            questions=formatted_questions,
            total=total_count,
            limit=limit,
            offset=offset,
            has_more=offset + len(formatted_questions) < total_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error browsing questions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to browse questions: {str(e)}"
        )


@router.get("/topics-summary")
async def get_topics_summary(
    section: Optional[str] = Query(None, description="Filter by section"),
    course_slug: Optional[str] = Query(None, description="Filter by course slug (e.g. sat, act)"),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
) -> List[TopicQuestionCount]:
    """
    Get question counts grouped by topic.
    Useful for showing available topics in the question pool UI.
    """
    try:
        # Resolve course_id from slug for filtering
        course_id = None
        if course_slug:
            course_result = db.table("courses").select("id").eq("slug", course_slug).execute()
            if course_result.data:
                course_id = course_result.data[0]["id"]

        # Paginate through all active questions to get accurate counts
        all_questions = []
        page_size = 1000
        offset = 0

        while True:
            query = db.table('questions').select(
                'difficulty, topic_id, '
                'topics!inner(id, name, category_id, categories!inner(id, name, section, course_id))'
            ).eq('is_active', True)

            # Apply course filter if provided
            if course_id:
                query = query.eq('topics.categories.course_id', course_id)

            # Apply section filter if provided
            if section:
                query = query.eq('topics.categories.section', section)
            
            result = query.range(offset, offset + page_size - 1).execute()
            all_questions.extend(result.data)
            
            if len(result.data) < page_size:
                break
            offset += page_size
        
        # Aggregate by topic
        topic_counts: Dict[str, Dict[str, Any]] = {}
        
        for q in all_questions:
            topic = q.get('topics', {})
            category = topic.get('categories', {}) if topic else {}
            topic_id = topic.get('id')
            
            if not topic_id:
                continue
            
            if topic_id not in topic_counts:
                topic_counts[topic_id] = {
                    'topic_id': topic_id,
                    'topic_name': topic.get('name', ''),
                    'category_id': category.get('id', ''),
                    'category_name': category.get('name', ''),
                    'section': category.get('section', ''),
                    'total_questions': 0,
                    'easy_count': 0,
                    'medium_count': 0,
                    'hard_count': 0,
                }
            
            topic_counts[topic_id]['total_questions'] += 1
            
            difficulty = q.get('difficulty')
            if difficulty == 'E':
                topic_counts[topic_id]['easy_count'] += 1
            elif difficulty == 'M':
                topic_counts[topic_id]['medium_count'] += 1
            elif difficulty == 'H':
                topic_counts[topic_id]['hard_count'] += 1
        
        # Convert to list and sort by section, then category, then topic name
        topics_list = list(topic_counts.values())
        topics_list.sort(key=lambda x: (x['section'], x['category_name'], x['topic_name']))
        
        return [TopicQuestionCount(**t) for t in topics_list]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting topics summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get topics summary: {str(e)}"
        )
