"""
Context Summarizer Service

Provides multi-turn conversation summarization and context extraction.
Uses OpenAI API to generate abstractive summaries of conversation history.

Features:
- Abstractive summarization of multi-turn conversations
- Key topic extraction
- Session context enrichment
- Smart context window management
"""

from typing import Optional, List
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class Message:
    """Represents a single conversation message."""
    
    def __init__(self, role: str, content: str, timestamp: Optional[datetime] = None):
        self.role = role
        self.content = content
        self.timestamp = timestamp or datetime.now()


class ContextSummary:
    """Represents a conversation summary."""
    
    def __init__(
        self,
        summary: str,
        key_topics: List[str],
        previous_queries: List[str],
        last_assistant_answer: Optional[str] = None,
        conversation_length: int = 0
    ):
        self.summary = summary
        self.key_topics = key_topics
        self.previous_queries = previous_queries
        self.last_assistant_answer = last_assistant_answer
        self.conversation_length = conversation_length


class ContextSummarizerService:
    """
    Summarizes multi-turn conversation history for context-aware responses.
    
    Reduces token usage while preserving conversation context by:
    - Extracting key topics from previous exchanges
    - Creating abstractive summaries of long conversations
    - Tracking conversation flow and user intent
    """
    
    def __init__(self, openai_client=None, enable_summarization: bool = True):
        """
        Initialize the context summarizer.
        
        Args:
            openai_client: OpenAI client instance
            enable_summarization: Whether to enable summarization (for graceful degradation)
        """
        self.openai_client = openai_client
        self.enable_summarization = enable_summarization
        self.max_messages_in_context = 8  # Keep recent messages for direct context
        self.summarization_threshold = 10  # Summarize after 10 messages
    
    def extract_key_topics(self, messages: List[Message]) -> List[str]:
        """
        Extract key topics from conversation messages.
        
        Args:
            messages: List of conversation messages
            
        Returns:
            List of identified topics
        """
        if not messages:
            return []
        
        # Simple topic extraction based on common support domain words
        support_topics = {
            "password": {"reset", "change", "forgot", "login", "recover"},
            "billing": {"payment", "invoice", "charge", "refund", "subscription", "cancel"},
            "technical": {"error", "bug", "issue", "crash", "not working", "broken"},
            "account": {"delete", "deactivate", "profile", "settings", "email"},
            "general": {"help", "how", "what", "why", "feature", "product"},
        }
        
        found_topics = set()
        all_text = " ".join([msg.content.lower() for msg in messages])
        
        for category, keywords in support_topics.items():
            if any(keyword in all_text for keyword in keywords):
                found_topics.add(category)
        
        return list(found_topics)
    
    def get_previous_queries(self, messages: List[Message], limit: int = 3) -> List[str]:
        """
        Extract previous user queries from conversation.
        
        Args:
            messages: List of conversation messages
            limit: Maximum number of queries to return
            
        Returns:
            List of previous user queries
        """
        queries = [msg.content for msg in messages if msg.role == "user"]
        return queries[-limit:] if queries else []
    
    def summarize_conversation(
        self,
        messages: List[Message],
        max_length: int = 200
    ) -> Optional[str]:
        """
        Generate an abstractive summary of conversation history.
        
        Args:
            messages: List of conversation messages
            max_length: Maximum summary length in tokens
            
        Returns:
            Summary string or None if summarization disabled/fails
        """
        if not self.enable_summarization or not self.openai_client:
            logger.warning("Context summarization disabled or OpenAI client unavailable")
            return None
        
        if len(messages) < self.summarization_threshold:
            return None
        
        try:
            # Build conversation text
            conversation_text = "\n".join([
                f"{msg.role.upper()}: {msg.content}"
                for msg in messages
            ])
            
            from app.services.ollama_service import get_active_model
            response = self.openai_client.chat.completions.create(
                model=get_active_model(),
                messages=[
                    {
                        "role": "system",
                        "content": "You are a concise conversation summarizer. Create a brief summary highlighting the main topics discussed and any important context. Keep it under 200 tokens."
                    },
                    {
                        "role": "user",
                        "content": f"Summarize this customer support conversation:\n\n{conversation_text}"
                    }
                ],
                temperature=0.3,
                max_tokens=100,
            )
            
            summary = response.choices[0].message.content
            logger.debug(f"Generated conversation summary: {len(summary)} chars")
            return summary
        
        except Exception as e:
            logger.error(f"Summarization failed: {str(e)}")
            return None
    
    def create_context_summary(
        self,
        messages: List[Message],
        last_answer: Optional[str] = None
    ) -> ContextSummary:
        """
        Create a comprehensive context summary from conversation history.
        
        Args:
            messages: List of conversation messages
            last_answer: Last assistant answer (for reference)
            
        Returns:
            ContextSummary object with topics, queries, and summary
        """
        key_topics = self.extract_key_topics(messages)
        previous_queries = self.get_previous_queries(messages)
        summary = self.summarize_conversation(messages) if messages else None
        
        context_summary = ContextSummary(
            summary=summary or "No previous context.",
            key_topics=key_topics,
            previous_queries=previous_queries,
            last_assistant_answer=last_answer,
            conversation_length=len(messages)
        )
        
        return context_summary
    
    def format_context_for_prompt(self, context_summary: ContextSummary) -> str:
        """
        Format context summary for inclusion in RAG prompt.
        
        Args:
            context_summary: ContextSummary object
            
        Returns:
            Formatted context string for injection into prompt
        """
        parts = []
        
        if context_summary.summary:
            parts.append(f"**Previous conversation context:**\n{context_summary.summary}\n")
        
        if context_summary.key_topics:
            parts.append(f"**Topics discussed:** {', '.join(context_summary.key_topics)}\n")
        
        if context_summary.previous_queries:
            parts.append(f"**Recent questions:** {'; '.join(context_summary.previous_queries)}\n")
        
        return "".join(parts) if parts else ""
    
    def get_context_window(
        self,
        messages: List[Message],
        window_size: int = 4
    ) -> List[Message]:
        """
        Extract a context window from recent messages for token efficiency.
        
        Args:
            messages: Full list of messages
            window_size: Number of recent message pairs to include
            
        Returns:
            Recent messages within window size
        """
        if len(messages) <= window_size:
            return messages
        
        # Return most recent messages up to window_size
        return messages[-window_size:]
    
    def is_context_relevant(
        self,
        current_query: str,
        context_summary: ContextSummary
    ) -> bool:
        """
        Determine if conversation context is relevant to current query.
        
        Args:
            current_query: Current user query
            context_summary: Context summary from previous exchanges
            
        Returns:
            True if context is likely relevant
        """
        if not context_summary.key_topics:
            return False
        
        query_lower = current_query.lower()
        
        # Check for topic continuity
        for topic in context_summary.key_topics:
            if topic in query_lower or any(
                keyword in query_lower
                for keyword in ["it", "that", "the issue", "this", "same", "also"]
            ):
                return True
        
        return False
