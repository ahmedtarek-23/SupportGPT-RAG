import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""

    answer: str
    sources: list[SourceChunk]
    query: str
    session_id: str | None = None


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Chat endpoint for answering user queries with session memory.

    Args:
        request: ChatRequest with query, optional top_k and session_id

    Returns:
        ChatResponse with answer, sources, and session_id
    """
    try:
        logger.info(f"Received chat request: {request.query[:100]}...")

        # Process query through RAG pipeline with caching and session support
        result = rag_service.answer_query(
            request.query,
            top_k=request.top_k,
            session_id=request.session_id,
        )

        # Format response
        response = ChatResponse(
            answer=result["answer"],
            sources=[SourceChunk(**source) for source in result["sources"]],
            query=result["query"],
            session_id=result.get("session_id"),
        )

        logger.info(f"Chat request processed successfully")
        return response

    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
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
