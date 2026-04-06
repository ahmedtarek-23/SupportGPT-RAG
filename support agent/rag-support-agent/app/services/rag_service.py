import logging
from openai import OpenAI
from app.services.retrieval_service import RetrievalService
from app.services.reranking_service import RerankerService
from app.services.cache_service import CacheService
from app.services.session_service import SessionManager
from app.services.context_summarizer_service import ContextSummarizerService, Message
from app.services.clarification_service import ClarificationService, AmbiguityLevel
from app.services.confidence_scorer import ConfidenceScorer
from app.schemas.chunk import ChunkWithScore
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class RAGService:
    """RAG (Retrieval-Augmented Generation) service with advanced conversation features (Phase 6)."""

    def __init__(self):
        settings = get_settings()
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.chat_model = settings.chat_model
        self.retrieval_service = RetrievalService()
        self.reranker = RerankerService() if settings.enable_reranking else None
        self.cache = CacheService()
        self.sessions = SessionManager()
        
        # Phase 6: Advanced conversation features
        self.context_summarizer = ContextSummarizerService(
            openai_client=self.client,
            enable_summarization=settings.enable_context_summarization
        )
        self.clarifier = ClarificationService(
            openai_client=self.client,
            enable_clarifications=settings.enable_clarifications
        )
        self.confidence_scorer = ConfidenceScorer()
        
        logger.info(f"Initialized RAGService with model: {self.chat_model}")
        if self.reranker and self.reranker.available:
            logger.info("Reranking enabled with semantic re-scoring")
        logger.info("Phase 6 features enabled: context summarization, clarifications, confidence scoring")

    def get_session_context_with_summary(self, session_id: str | None) -> tuple[str | None, dict | None]:
        """
        Get session context with optional summarization for efficiency.
        
        Args:
            session_id: Session ID
            
        Returns:
            Tuple of (context_prompt, context_summary)
        """
        if not session_id or not self.sessions.enabled:
            return None, None
        
        # Get session messages
        session = self.sessions.get_session(session_id)
        if not session or not session.get("messages"):
            return None, None
        
        # Convert to Message objects for summarizer
        messages = [
            Message(role=msg["role"], content=msg["content"])
            for msg in session["messages"]
        ]
        
        # Create context summary
        context_summary_obj = self.context_summarizer.create_context_summary(messages)
        
        # Format for prompt injection
        context_prompt = self.context_summarizer.format_context_for_prompt(context_summary_obj)
        
        return context_prompt or None, {
            "summary": context_summary_obj.summary,
            "topics": context_summary_obj.key_topics,
            "previous_queries": context_summary_obj.previous_queries
        }
    
    def check_clarification_needed(self, query: str, session_id: str | None = None) -> dict | None:
        """
        Check if clarification is needed for ambiguous queries.
        
        Args:
            query: User query
            session_id: Optional session ID for context
            
        Returns:
            Clarification question dict or None if not needed
        """
        ambiguity = self.clarifier.detect_ambiguity(query)
        
        if self.clarifier.should_ask_clarification(query):
            clarification = self.clarifier.generate_clarifications(query, ambiguity)
            if clarification:
                return self.clarifier.format_clarification_message(clarification)
        
        return None
    
    def score_answer_confidence(
        self,
        retrieved_chunks: list[ChunkWithScore],
        query: str,
        answer: str
    ) -> dict:
        """
        Score confidence in the generated answer.
        
        Args:
            retrieved_chunks: Retrieved chunks
            query: User query
            answer: Generated answer
            
        Returns:
            Confidence score dict
        """
        # Convert chunks to dict format for confidence scorer
        chunks_dict = [
            {
                "text": chunk.text,
                "source": chunk.source,
                "similarity_score": float(chunk.similarity_score),
            }
            for chunk in retrieved_chunks
        ]
        
        confidence_score = self.confidence_scorer.calculate_confidence_score(
            chunks_dict,
            query,
            answer,
            sources_count=len(retrieved_chunks)
        )
        
        return self.confidence_scorer.format_confidence_response(confidence_score, answer)

    def build_prompt(
        self,
        query: str,
        retrieved_chunks: list[ChunkWithScore],
        session_context: str | None = None,
    ) -> str:
        """
        Build a prompt with query and retrieved context.

        Args:
            query: The user query
            retrieved_chunks: List of relevant chunks
            session_context: Optional conversation history context

        Returns:
            Formatted prompt for LLM
        """
        context = "\n\n".join([f"Source: {chunk.source}\n{chunk.text}" for chunk in retrieved_chunks])

        system_prompt = "You are a helpful customer support assistant. Use the provided context to answer the user's question accurately and concisely."

        if session_context:
            # Include session context in system prompt
            system_prompt += f"\n\nConversation history:\n{session_context}"

        prompt = f"""You are a helpful customer support assistant. Use the provided context to answer the user's question accurately and concisely.

Context:
{context}

Question: {query}

Answer:"""
        return prompt

    def generate_answer(
        self, query: str, retrieved_chunks: list[ChunkWithScore], session_context: str | None = None
    ) -> str:
        """
        Generate an answer using OpenAI chat API.

        Args:
            query: The user query
            retrieved_chunks: List of relevant chunks
            session_context: Optional conversation history

        Returns:
            Generated answer text
        """
        prompt = self.build_prompt(query, retrieved_chunks, session_context)

        try:
            response = self.client.chat.completions.create(
                model=self.chat_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful customer support assistant.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=512,
            )

            answer = response.choices[0].message.content
            logger.info(f"Generated answer for query: {query[:50]}...")
            return answer

        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            raise

    def answer_query(self, query: str, top_k: int | None = None, session_id: str | None = None) -> dict:
        """
        Answer a user query using RAG pipeline with caching and session support.

        Args:
            query: The user query
            top_k: Number of chunks to retrieve (optional)
            session_id: Session ID for conversation memory (optional)

        Returns:
            Dict with 'answer', 'sources', and 'session_id' keys
        """
        logger.info(f"Processing query: {query}")

        # Generate cache key (includes query and top_k)
        cache_key = self.cache._generate_cache_key("chat_response", query=query, top_k=top_k)

        # Try cache first
        if self.cache.enabled and self.cache.available:
            cached_response = self.cache.get(cache_key)
            if cached_response:
                logger.info(f"Cache hit for query: {query[:50]}...")
                # Update session if provided
                if session_id:
                    self.sessions.add_message(session_id, "user", query)
                    self.sessions.add_message(session_id, "assistant", cached_response.get("answer", ""))
                return cached_response

        # Create session if not provided
        if session_id is None and self.sessions.enabled:
            session_id = self.sessions.create_session()

        # Add user message to session
        if session_id:
            self.sessions.add_message(session_id, "user", query)

        # Step 1: Retrieve relevant chunks
        retrieved_chunks = self.retrieval_service.retrieve(query, top_k=top_k)

        if not retrieved_chunks:
            logger.warning("No relevant chunks found for query")
            response = {
                "answer": "I couldn't find relevant information to answer your question. Please try rephrasing or contact support.",
                "sources": [],
                "query": query,
                "session_id": session_id,
            }
            return response

        # Step 2: Re-rank chunks using cross-encoder if enabled
        if self.reranker and self.reranker.available:
            retrieved_chunks, rerank_scores = self.reranker.rerank(query, retrieved_chunks)
            logger.debug(f"Reranked chunks: {len(retrieved_chunks)} results with cross-encoder")

        # Step 3: Get session context if available
        session_context = None
        if session_id and self.sessions.enabled:
            session_context = self.sessions.build_context_prompt(session_id)

        # Step 3: Get session context if available
        session_context = None
        if session_id and self.sessions.enabled:
            session_context = self.sessions.build_context_prompt(session_id)

        # Step 4: Generate answer
        answer = self.generate_answer(query, retrieved_chunks, session_context)

        # Step 5: Format response with sources
        sources = [
            {
                "text": chunk.text,
                "source": chunk.source,
                "similarity_score": float(chunk.similarity_score),
            }
            for chunk in retrieved_chunks
        ]

        response = {
            "answer": answer,
            "sources": sources,
            "query": query,
            "session_id": session_id,
        }

        # Cache the response
        if self.cache.enabled and self.cache.available:
            self.cache.set(cache_key, response)

        # Add assistant message to session
        if session_id:
            self.sessions.add_message(session_id, "assistant", answer)

        return response
