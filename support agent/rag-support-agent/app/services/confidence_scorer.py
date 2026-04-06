"""
Confidence Scorer Service

Scores answer confidence and provides explainability metrics.

Features:
- Retrieval quality confidence scoring
- Answer explainability with source attribution
- Query-intent matching scoring
- Confidence-based response filtering
"""

from typing import List, Optional, Dict, Any, Tuple
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ConfidenceLevel(Enum):
    """Confidence levels for answers."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INSUFFICIENT = "insufficient"


@dataclass
class ConfidenceScore:
    """Represents a confidence score with explanation."""
    overall_score: float  # 0.0 to 1.0
    retrieval_score: float  # Based on similarity scores
    relevance_score: float  # Based on source quality
    intent_match_score: float  # Query-intent alignment
    level: ConfidenceLevel
    explanation: str
    source_attribution: List[Dict[str, Any]]


class ConfidenceScorer:
    """
    Scores answer confidence and provides explainability.
    
    Helps users understand:
    - How confident the system is in its answer
    - Which sources informed the response
    - What's missing or unclear
    """
    
    def __init__(
        self,
        high_confidence_threshold: float = 0.75,
        medium_confidence_threshold: float = 0.50,
        low_confidence_threshold: float = 0.30
    ):
        """
        Initialize confidence scorer.
        
        Args:
            high_confidence_threshold: Score above which confidence is high
            medium_confidence_threshold: Score above which confidence is medium
            low_confidence_threshold: Score above which confidence is low
        """
        self.high_threshold = high_confidence_threshold
        self.medium_threshold = medium_confidence_threshold
        self.low_threshold = low_confidence_threshold
    
    def calculate_retrieval_score(
        self,
        retrieved_chunks: List[Dict[str, Any]],
        top_k: int = 3
    ) -> float:
        """
        Calculate confidence score based on retrieval quality.
        
        Args:
            retrieved_chunks: List of retrieved chunks with scores
            top_k: Number of top chunks to consider
            
        Returns:
            Retrieval score 0.0-1.0
        """
        if not retrieved_chunks:
            return 0.0
        
        # Use top-k chunks for scoring
        top_chunks = retrieved_chunks[:top_k]
        
        if not top_chunks:
            return 0.0
        
        # Average similarity score of top chunks
        scores = [
            chunk.get("similarity_score", 0.0) 
            for chunk in top_chunks 
            if "similarity_score" in chunk
        ]
        
        if not scores:
            return 0.0
        
        avg_score = sum(scores) / len(scores)
        
        # Bonus if multiple high-quality sources
        if len(top_chunks) >= 3 and avg_score > 0.7:
            avg_score = min(1.0, avg_score * 1.1)
        
        return min(1.0, max(0.0, avg_score))
    
    def calculate_relevance_score(
        self,
        retrieved_chunks: List[Dict[str, Any]],
        query: str
    ) -> float:
        """
        Calculate how relevant sources are to query.
        
        Args:
            retrieved_chunks: List of retrieved chunks
            query: Original user query
            
        Returns:
            Relevance score 0.0-1.0
        """
        if not retrieved_chunks or not query:
            return 0.0
        
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        relevance_scores = []
        
        for chunk in retrieved_chunks[:3]:
            text = chunk.get("text", "").lower()
            chunk_words = set(text.split())
            
            # Calculate keyword overlap
            overlap = len(query_words & chunk_words) / len(query_words) if query_words else 0
            
            # Check for semantic closeness indicators
            has_direct_match = any(word in text for word in query_words if len(word) > 3)
            
            score = overlap * 0.7 + (0.3 if has_direct_match else 0)
            relevance_scores.append(min(1.0, score))
        
        return sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0.0
    
    def calculate_intent_match_score(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> float:
        """
        Score how well retrieved chunks match query intent.
        
        Args:
            query: User query
            retrieved_chunks: Retrieved chunks
            
        Returns:
            Intent match score 0.0-1.0
        """
        query_lower = query.lower()
        
        # Intent indicators
        intent_keywords = {
            "how": ["guide", "step", "instruction", "process"],
            "what": ["definition", "explain", "description", "meaning"],
            "why": ["reason", "because", "cause", "fact"],
            "where": ["location", "place", "section", "area"],
            "when": ["time", "date", "schedule", "period"],
            "can": ["capability", "feature", "possible", "support"],
            "reset": ["reset", "restore", "clear", "initialize"],
            "update": ["update", "change", "modify", "new version"],
        }
        
        detected_intent = None
        for keyword, indicators in intent_keywords.items():
            if keyword in query_lower:
                detected_intent = keyword
                break
        
        if not detected_intent:
            return 0.5  # Neutral confidence for undetected intent
        
        # Check if chunks address the detected intent
        all_text = " ".join([chunk.get("text", "") for chunk in retrieved_chunks]).lower()
        
        intent_indicators = intent_keywords.get(detected_intent, [])
        matching_indicators = sum(1 for indicator in intent_indicators if indicator in all_text)
        
        return min(1.0, matching_indicators / len(intent_indicators)) if intent_indicators else 0.5
    
    def calculate_confidence_score(
        self,
        retrieved_chunks: List[Dict[str, Any]],
        query: str,
        answer: str,
        sources_count: int = 0
    ) -> ConfidenceScore:
        """
        Calculate overall confidence score for an answer.
        
        Args:
            retrieved_chunks: Retrieved chunks used for answer
            query: User query
            answer: Generated answer
            sources_count: Number of sources cited in answer
            
        Returns:
            ConfidenceScore object
        """
        retrieval_score = self.calculate_retrieval_score(retrieved_chunks)
        relevance_score = self.calculate_relevance_score(retrieved_chunks, query)
        intent_match_score = self.calculate_intent_match_score(query, retrieved_chunks)
        
        # Weighted average
        overall_score = (
            retrieval_score * 0.5 +
            relevance_score * 0.3 +
            intent_match_score * 0.2
        )
        
        # Bonus for multiple sources
        if sources_count > 2:
            overall_score = min(1.0, overall_score * 1.05)
        
        # Penalty if answer is very short (might be incomplete)
        if len(answer.split()) < 20:
            overall_score = overall_score * 0.9
        
        # Determine confidence level
        if overall_score >= self.high_threshold:
            level = ConfidenceLevel.HIGH
        elif overall_score >= self.medium_threshold:
            level = ConfidenceLevel.MEDIUM
        elif overall_score >= self.low_threshold:
            level = ConfidenceLevel.LOW
        else:
            level = ConfidenceLevel.INSUFFICIENT
        
        # Generate explanation
        explanation = self._generate_explanation(
            level,
            retrieval_score,
            relevance_score,
            intent_match_score,
            sources_count
        )
        
        # Attribution
        attribution = self._format_source_attribution(retrieved_chunks[:3])
        
        return ConfidenceScore(
            overall_score=round(overall_score, 2),
            retrieval_score=round(retrieval_score, 2),
            relevance_score=round(relevance_score, 2),
            intent_match_score=round(intent_match_score, 2),
            level=level,
            explanation=explanation,
            source_attribution=attribution
        )
    
    def _generate_explanation(
        self,
        level: ConfidenceLevel,
        retrieval_score: float,
        relevance_score: float,
        intent_match_score: float,
        sources_count: int
    ) -> str:
        """Generate human-readable confidence explanation."""
        
        reasons = []
        
        if level == ConfidenceLevel.HIGH:
            reasons.append("Multiple high-quality sources confirm this answer")
            if sources_count > 2:
                reasons.append(f"Information sourced from {sources_count} relevant documents")
        
        elif level == ConfidenceLevel.MEDIUM:
            if retrieval_score < 0.6:
                reasons.append("Source relevance could be higher")
            if intent_match_score < 0.6:
                reasons.append("Answer may not fully address your intent")
            reasons.append("Based on available documentation")
        
        elif level == ConfidenceLevel.LOW:
            reasons.append("Limited relevant information found")
            if retrieval_score < 0.5:
                reasons.append("Retrieved sources have low similarity")
            reasons.append("Consider rephrasing your question for better results")
        
        else:  # INSUFFICIENT
            reasons.append("Insufficient information to provide a confident answer")
            reasons.append("Try asking a more specific question or contact support")
        
        return "; ".join(reasons)
    
    def _format_source_attribution(
        self,
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Format source attribution for display."""
        
        attribution = []
        for i, chunk in enumerate(chunks, 1):
            attribution.append({
                "index": i,
                "source": chunk.get("source", "Unknown"),
                "snippet": chunk.get("text", "")[:150] + "...",
                "similarity": chunk.get("similarity_score", 0),
                "relevance": chunk.get("reranker_score", chunk.get("similarity_score", 0))
            })
        
        return attribution
    
    def should_provide_answer(self, confidence_score: ConfidenceScore) -> bool:
        """
        Determine if system should provide answer based on confidence.
        
        Args:
            confidence_score: Calculated confidence score
            
        Returns:
            True if confidence is sufficient to answer
        """
        return confidence_score.level in [ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM]
    
    def format_confidence_response(
        self,
        confidence_score: ConfidenceScore,
        answer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Format confidence information for API response.
        
        Args:
            confidence_score: Calculated confidence score
            answer: Generated answer (optional)
            
        Returns:
            Formatted dictionary for API response
        """
        return {
            "confidence": {
                "level": confidence_score.level.value,
                "score": confidence_score.overall_score,
                "breakdown": {
                    "retrieval": confidence_score.retrieval_score,
                    "relevance": confidence_score.relevance_score,
                    "intent_match": confidence_score.intent_match_score
                },
                "explanation": confidence_score.explanation
            },
            "sources": confidence_score.source_attribution,
            "answer": answer if answer else None
        }
