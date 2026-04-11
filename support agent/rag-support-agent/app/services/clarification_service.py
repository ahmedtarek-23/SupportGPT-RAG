"""
Clarification Service

Detects ambiguous queries and generates clarifying questions to improve retrieval.

Features:
- Ambiguity detection in user queries
- Multi-choice clarification question generation
- Context-aware clarifications
- Graceful degradation
"""

from typing import List, Optional, Dict, Any
import logging
import json
from enum import Enum

logger = logging.getLogger(__name__)


class AmbiguityLevel(Enum):
    """Levels of query ambiguity."""
    CLEAR = "clear"
    MODERATE = "moderate"
    HIGH = "high"


class ClarificationQuestion:
    """Represents a clarification question."""
    
    def __init__(self, question: str, options: List[str], context: Optional[str] = None):
        self.question = question
        self.options = options
        self.context = context


class ClarificationService:
    """
    Detects ambiguous queries and generates clarifying questions.
    
    Improves retrieval quality by narrowing search scope when user intent is unclear.
    """
    
    def __init__(self, openai_client=None, enable_clarifications: bool = True):
        """
        Initialize the clarification service.
        
        Args:
            openai_client: OpenAI client instance
            enable_clarifications: Whether to enable clarifications
        """
        self.openai_client = openai_client
        self.enable_clarifications = enable_clarifications
        
        # Ambiguity indicators
        self.ambiguous_patterns = [
            ("issue", ["general issue", "technical problem", "account issue", "billing issue"]),
            ("problem", ["cannot do something", "something not working", "error message"]),
            ("help", ["information needed", "guidance", "how-to"]),
            ("it", ["referring to previous context", "unclear reference"]),
            ("that", ["unclear reference to what", "needs context"]),
        ]
        
        # Common support categories
        self.support_categories = {
            "account": ["profile", "login", "password", "email", "settings"],
            "billing": ["payment", "invoice", "subscription", "charge", "refund"],
            "technical": ["error", "bug", "crash", "feature", "integration"],
            "general": ["information", "documentation", "how-to", "guide"],
        }
    
    def detect_ambiguity(self, query: str) -> AmbiguityLevel:
        """
        Detect ambiguity level in query.
        
        Args:
            query: User query to analyze
            
        Returns:
            AmbiguityLevel enum
        """
        query_lower = query.lower()
        vague_words = ["it", "that", "this", "thing", "stuff", "issue", "problem", "help"]
        
        vague_count = sum(1 for word in vague_words if f" {word} " in f" {query_lower} " or query_lower.startswith(word))
        
        # Check for question completeness
        has_subject = any(word in query_lower for word in ["i", "my", "the", "a"])
        has_action = any(word in query_lower for word in ["reset", "change", "update", "delete", "can't", "not"])
        
        if vague_count >= 2:
            return AmbiguityLevel.HIGH
        elif vague_count == 1 or not (has_subject and has_action):
            return AmbiguityLevel.MODERATE
        else:
            return AmbiguityLevel.CLEAR
    
    def categorize_intent(self, query: str) -> List[str]:
        """
        Categorize user intent based on keywords.
        
        Args:
            query: User query
            
        Returns:
            List of probable categories
        """
        query_lower = query.lower()
        matched_categories = []
        
        for category, keywords in self.support_categories.items():
            if any(keyword in query_lower for keyword in keywords):
                matched_categories.append(category)
        
        return matched_categories if matched_categories else ["general"]
    
    def generate_clarifications(
        self,
        query: str,
        ambiguity_level: AmbiguityLevel,
        num_options: int = 3
    ) -> Optional[ClarificationQuestion]:
        """
        Generate clarification question for ambiguous query.
        
        Args:
            query: User query
            ambiguity_level: Detected ambiguity level
            num_options: Number of clarification options to generate
            
        Returns:
            ClarificationQuestion or None if not ambiguous
        """
        if ambiguity_level == AmbiguityLevel.CLEAR or not self.enable_clarifications:
            return None
        
        # Use LLM-based clarification if available
        if self.openai_client and ambiguity_level == AmbiguityLevel.HIGH:
            return self._generate_llm_clarifications(query, num_options)
        else:
            return self._generate_pattern_clarifications(query, ambiguity_level)
    
    def _generate_pattern_clarifications(
        self,
        query: str,
        ambiguity_level: AmbiguityLevel
    ) -> Optional[ClarificationQuestion]:
        """
        Generate clarifications based on pattern matching (no LLM).
        
        Args:
            query: User query
            ambiguity_level: Ambiguity level
            
        Returns:
            ClarificationQuestion or None
        """
        categories = self.categorize_intent(query)
        
        if len(categories) == 1:
            category = categories[0]
            
            if category == "account":
                return ClarificationQuestion(
                    question="What's your main concern about your account?",
                    options=["Password/Login", "Profile Settings", "Account Security", "Email/Username"]
                )
            elif category == "billing":
                return ClarificationQuestion(
                    question="What's your billing-related question?",
                    options=["Invoice/Receipt", "Payment Method", "Subscription", "Refund/Cancellation"]
                )
            elif category == "technical":
                return ClarificationQuestion(
                    question="What type of issue are you experiencing?",
                    options=["Feature Not Working", "Error Message", "Performance", "Integration"]
                )
        
        return None
    
    def _generate_llm_clarifications(
        self,
        query: str,
        num_options: int = 3
    ) -> Optional[ClarificationQuestion]:
        """
        Generate clarifications using OpenAI API for better contextual questions.
        
        Args:
            query: User query
            num_options: Number of clarification options
            
        Returns:
            ClarificationQuestion or None
        """
        try:
            from app.services.ollama_service import get_active_model
            response = self.openai_client.chat.completions.create(
                model=get_active_model(),
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are a customer support specialist. The user's query is unclear or ambiguous. 
                        Generate ONE clarifying question with {num_options} specific options to help understand their issue better.
                        
                        Respond in JSON format:
                        {{"question": "Your clarifying question?", "options": ["Option 1", "Option 2", "Option 3"]}}"""
                    },
                    {
                        "role": "user",
                        "content": f"User query: {query}\n\nGenerate a clarifying question to better understand what they need."
                    }
                ],
                temperature=0.5,
                max_tokens=150,
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON response
            data = json.loads(content)
            return ClarificationQuestion(
                question=data.get("question", "Can you provide more details?"),
                options=data.get("options", [])
            )
        
        except Exception as e:
            logger.error(f"LLM clarification generation failed: {str(e)}")
            return None
    
    def should_ask_clarification(
        self,
        query: str,
        previous_attempts: int = 0
    ) -> bool:
        """
        Determine if clarification should be requested.
        
        Args:
            query: User query
            previous_attempts: Number of previous retrieval attempts for this query
            
        Returns:
            True if clarification should be requested
        """
        if not self.enable_clarifications:
            return False
        
        ambiguity = self.detect_ambiguity(query)
        
        # Ask for clarification on high ambiguity or repeated unclear queries
        if ambiguity == AmbiguityLevel.HIGH:
            return True
        
        if ambiguity == AmbiguityLevel.MODERATE and previous_attempts > 0:
            return True
        
        return False
    
    def refine_query_with_clarification(
        self,
        original_query: str,
        clarification_response: str
    ) -> str:
        """
        Refine query based on user's clarification response.
        
        Args:
            original_query: Original user query
            clarification_response: User's response to clarification
            
        Returns:
            Refined query combining original and clarification
        """
        refined = f"{original_query} (specifically: {clarification_response})"
        return refined
    
    def format_clarification_message(
        self,
        clarification: ClarificationQuestion
    ) -> Dict[str, Any]:
        """
        Format clarification question for API response.
        
        Args:
            clarification: ClarificationQuestion object
            
        Returns:
            Formatted dictionary for API response
        """
        return {
            "type": "clarification_needed",
            "question": clarification.question,
            "options": clarification.options,
            "context": clarification.context,
            "require_response": True
        }
