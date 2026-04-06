import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.services.rag_service import RAGService
from app.services.session_service import SessionManager

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
rag_service = RAGService()
session_manager = SessionManager()


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""

    query: str
    top_k: int | None = None
    session_id: str | None = None


class SourceChunk(BaseModel):
    """Source chunk in response."""

    text: str
    source: str
    similarity_score: float


class ConfidenceInfo(BaseModel):
    """Confidence information for answer."""
    
    level: str  # high, medium, low, insufficient
    score: float  # 0.0-1.0
    breakdown: dict  # retrieval, relevance, intent_match
    explanation: str


class ClarificationOption(BaseModel):
    """Clarification question and options."""
    
    type: str
    question: str
    options: List[str]
    context: Optional[str] = None
    require_response: bool = True


class ChatResponse(BaseModel):
    """Response model for chat endpoint with Phase 6 features."""

    answer: str
    sources: list[SourceChunk]
    query: str
    session_id: str | None = None
    confidence: Optional[ConfidenceInfo] = None  # Phase 6
    clarifications: Optional[ClarificationOption] = None  # Phase 6


class ClarifyRequest(BaseModel):
    """Request for clarification endpoint."""
    
    session_id: str
    original_query: str
    clarification_response: str


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Chat endpoint for answering user queries with Phase 6 advanced features.
    
    Features:
    - Context summarization for multi-turn conversations
    - Ambiguity detection and clarifying questions
    - Answer confidence scoring with explainability
    - Multi-source attribution

    Args:
        request: ChatRequest with query, optional top_k and session_id

    Returns:
        ChatResponse with answer, sources, confidence, and clarifications
    """
    try:
        logger.info(f"Received chat request: {request.query[:100]}...")

        # Step 1: Check if clarification is needed
        clarification = rag_service.check_clarification_needed(
            request.query,
            session_id=request.session_id
        )
        
        if clarification:
            logger.info("Ambiguous query detected, requesting clarification")
            return ChatResponse(
                answer="",
                sources=[],
                query=request.query,
                session_id=request.session_id,
                clarifications=ClarificationOption(**clarification)
            )

        # Process query through RAG pipeline with caching and session support
        result = rag_service.answer_query(
            request.query,
            top_k=request.top_k,
            session_id=request.session_id,
        )

        # Step 2: Score answer confidence (Phase 6)
        confidence_info = None
        if result.get("sources"):
            confidence_dict = rag_service.score_answer_confidence(
                result.get("retrieved_chunks", []),
                request.query,
                result["answer"]
            )
            if confidence_dict:
                confidence_info = ConfidenceInfo(**confidence_dict.get("confidence", {}))

        # Format response
        response = ChatResponse(
            answer=result["answer"],
            sources=[SourceChunk(**source) for source in result["sources"]],
            query=result["query"],
            session_id=result.get("session_id"),
            confidence=confidence_info
        )

        logger.info(f"Chat request processed successfully with Phase 6 features")
        return response

    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/clarify", response_model=ChatResponse)
async def clarify_endpoint(request: ClarifyRequest):
    """
    Handle clarification responses and refine query (Phase 6).
    
    When a clarification question is asked, user selects an option which is used
    to refine the query for better retrieval.

    Args:
        request: ClarifyRequest with session_id, original_query, and clarification_response

    Returns:
        ChatResponse with refined answer based on clarification
    """
    try:
        logger.info(f"Processing clarification response: {request.clarification_response}")

        # Refine query based on clarification
        refined_query = rag_service.clarifier.refine_query_with_clarification(
            request.original_query,
            request.clarification_response
        )
        
        logger.info(f"Refined query: {refined_query}")

        # Process refined query through RAG pipeline
        result = rag_service.answer_query(
            refined_query,
            session_id=request.session_id,
        )

        # Score answer confidence
        confidence_dict = rag_service.score_answer_confidence(
            result.get("retrieved_chunks", []),
            refined_query,
            result["answer"]
        )
        
        confidence_info = ConfidenceInfo(**confidence_dict.get("confidence", {})) if confidence_dict else None

        response = ChatResponse(
            answer=result["answer"],
            sources=[SourceChunk(**source) for source in result["sources"]],
            query=refined_query,
            session_id=result.get("session_id"),
            confidence=confidence_info
        )

        logger.info("Clarification handled successfully")
        return response

    except Exception as e:
        logger.error(f"Error processing clarification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/session/create")
async def create_session():
    """Create a new chat session."""
    try:
        session_id = session_manager.create_session()
        return {
            "session_id": session_id,
            "message": "Session created successfully",
        }
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/session/{session_id}")
async def get_session(session_id: str):
    """Get session history and metadata."""
    try:
        session_data = session_manager.get_session(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")

        return {
            "session_id": session_id,
            "created_at": session_data.get("created_at"),
            "messages": session_data.get("messages", []),
            "metadata": session_data.get("metadata", {}),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/chat/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    try:
        success = session_manager.delete_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")

        return {"message": "Session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/health")
async def chat_health():
    """Health check for chat service."""
    return {"status": "healthy", "service": "chat"}
