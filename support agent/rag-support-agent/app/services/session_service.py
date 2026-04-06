"""
Session management service for tracking conversation context.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import List, Optional

from app.services.cache_service import CacheService
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class ChatMessage:
    """Represents a single message in a conversation."""

    def __init__(self, role: str, content: str, timestamp: Optional[str] = None):
        self.role = role  # "user" or "assistant"
        self.content = content
        self.timestamp = timestamp or datetime.utcnow().isoformat()

    def to_dict(self):
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
        }

    @staticmethod
    def from_dict(data: dict):
        return ChatMessage(data["role"], data["content"], data.get("timestamp"))


class SessionManager:
    """Manages user conversation sessions with memory."""

    def __init__(self):
        self.cache = CacheService()
        self.settings = get_settings()
        self.enabled = self.settings.enable_session_memory
        self.session_ttl = self.settings.session_ttl_seconds
        logger.info(f"Initialized SessionManager (enabled={self.enabled})")

    def create_session(self) -> str:
        """
        Create a new conversation session.

        Returns:
            Session ID (UUID)
        """
        session_id = str(uuid.uuid4())
        session_data = {
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "messages": [],
            "metadata": {},
        }

        key = f"session:{session_id}"
        self.cache.set(key, session_data, ttl=self.session_ttl)
        logger.info(f"Created session: {session_id}")
        return session_id

    def get_session(self, session_id: str) -> Optional[dict]:
        """
        Retrieve session data.

        Args:
            session_id: Session ID

        Returns:
            Session data or None if not found
        """
        if not self.enabled or not self.cache.available:
            return None

        key = f"session:{session_id}"
        return self.cache.get(key)

    def add_message(self, session_id: str, role: str, content: str) -> bool:
        """
        Add a message to a session's conversation history.

        Args:
            session_id: Session ID
            role: "user" or "assistant"
            content: Message content

        Returns:
            True if successful
        """
        if not self.enabled or not self.cache.available:
            return False

        try:
            key = f"session:{session_id}"
            session_data = self.cache.get(key)

            if not session_data:
                logger.warning(f"Session not found: {session_id}")
                return False

            # Add message to history
            message = ChatMessage(role, content)
            session_data["messages"].append(message.to_dict())
            session_data["updated_at"] = datetime.utcnow().isoformat()

            # Update session
            self.cache.set(key, session_data, ttl=self.session_ttl)
            logger.debug(f"Added {role} message to session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error adding message to session {session_id}: {e}")
            return False

    def get_messages(self, session_id: str) -> List[dict]:
        """
        Get conversation history for a session.

        Args:
            session_id: Session ID

        Returns:
            List of messages (user and assistant)
        """
        if not self.enabled or not self.cache.available:
            return []

        session_data = self.get_session(session_id)
        if session_data:
            return session_data.get("messages", [])
        return []

    def build_context_prompt(self, session_id: str) -> Optional[str]:
        """
        Build a context string from recent conversation history.

        Args:
            session_id: Session ID

        Returns:
            Formatted context string or None
        """
        messages = self.get_messages(session_id)
        if not messages:
            return None

        # Keep last 5 messages for context (to avoid token explosion)
        recent_messages = messages[-5:]
        context_lines = [f"{msg['role']}: {msg['content']}" for msg in recent_messages]
        return "\n".join(context_lines)

    def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        if not self.cache.available:
            return False

        key = f"session:{session_id}"
        return self.cache.delete(key)

    def set_session_metadata(self, session_id: str, key: str, value: any) -> bool:
        """
        Store metadata on a session (e.g., user_id, context tags).

        Args:
            session_id: Session ID
            key: Metadata key
            value: Metadata value

        Returns:
            True if successful
        """
        if not self.cache.available:
            return False

        try:
            cache_key = f"session:{session_id}"
            session_data = self.cache.get(cache_key)

            if not session_data:
                return False

            session_data["metadata"][key] = value
            self.cache.set(cache_key, session_data, ttl=self.session_ttl)
            return True

        except Exception as e:
            logger.error(f"Error setting session metadata: {e}")
            return False

    def get_session_metadata(self, session_id: str, key: str) -> Optional[any]:
        """Get metadata from a session."""
        session_data = self.get_session(session_id)
        if session_data:
            return session_data.get("metadata", {}).get(key)
        return None
