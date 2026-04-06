"""
Query expansion service for improving retrieval coverage.

Implements multiple query expansion techniques:
- Synonym expansion (expand terms with common synonyms)
- Query rewriting (rephrase for clarity)
- Query decomposition (break into sub-queries)
"""

import logging
import json
from typing import List, Set, Dict
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Default synonyms dictionary for support domain
DEFAULT_SYNONYMS = {
    "password": ["pwd", "credentials", "login"],
    "reset": ["change", "update", "modify"],
    "payment": ["billing", "charge", "transaction", "invoice"],
    "account": ["profile", "user account", "account settings"],
    "refund": ["money back", "return", "reimbursement"],
    "cancel": ["stop", "terminate", "end", "remove"],
    "subscription": ["plan", "membership"],
    "discount": ["coupon", "promotion", "promo", "offer"],
    "support": ["help", "assistance", "customer service"],
    "error": ["issue", "problem", "bug", "failure"],
    "contact": ["reach", "call", "email", "connect"],
    "delete": ["remove", "erase", "purge"],
    "download": ["get", "retrieve", "fetch", "export"],
    "upload": ["submit", "send", "import"],
    "access": ["view", "see", "view permissions"],
}


class QueryExpansionService:
    """
    Query expansion service for improving retrieval coverage.
    
    Expands queries using:
    - Synonym replacement
    - Query rewriting patterns
    - Query decomposition
    """
    
    def __init__(self, synonyms_dict: Dict[str, List[str]] = None):
        """
        Initialize query expansion service.
        
        Args:
            synonyms_dict: Custom synonyms dictionary (defaults to built-in)
        """
        settings = get_settings()
        self.enable_synonyms = settings.query_expansion_synonyms
        self.enable_rewriting = settings.query_expansion_rewriting
        self.enable_decomposition = settings.query_expansion_decomposition
        self.max_expansions = settings.query_expansion_max_expansions
        
        # Use provided synonyms or defaults
        self.synonyms = synonyms_dict or DEFAULT_SYNONYMS
        
        logger.info(
            f"Query expansion initialized: "
            f"synonyms={self.enable_synonyms}, "
            f"rewriting={self.enable_rewriting}, "
            f"decomposition={self.enable_decomposition}"
        )
    
    def _tokenize(self, query: str) -> List[str]:
        """Tokenize query into words."""
        return [word.lower().strip(".,?!\"'") for word in query.split() if word.strip()]
    
    def expand_with_synonyms(self, query: str) -> List[str]:
        """
        Expand query with synonyms.
        
        Args:
            query: Original query
        
        Returns:
            List of expanded queries
        """
        if not self.enable_synonyms:
            return [query]
        
        try:
            tokens = self._tokenize(query)
            expansions = [query]  # Include original
            
            # Find tokens with synonyms
            for token in tokens:
                if token in self.synonyms:
                    for synonym in self.synonyms[token]:
                        # Create expansion by replacing token with synonym
                        expanded = query.lower().replace(token, synonym)
                        if expanded not in expansions:
                            expansions.append(expanded)
                        
                        # Limit expansions
                        if len(expansions) >= self.max_expansions:
                            break
                
                if len(expansions) >= self.max_expansions:
                    break
            
            return expansions[:self.max_expansions]
        except Exception as e:
            logger.error(f"Error during synonym expansion: {e}")
            return [query]
    
    def rewrite_query(self, query: str) -> List[str]:
        """
        Rewrite query using simple heuristics.
        
        Applies patterns like:
        - "How to X" → "X"
        - "Can I X" → "X"
        - "Do you have X" → "X"
        - "What is X" → "X"
        
        Args:
            query: Original query
        
        Returns:
            List of rewritten query variations
        """
        if not self.enable_rewriting:
            return [query]
        
        try:
            rewrites = [query]  # Include original
            query_lower = query.lower()
            
            # Pattern-based rewriting
            patterns = {
                "how to ": "how to|",
                "how can i ": "can i|",
                "can i ": "can i|",
                "can you ": "can you|",
                "do you have ": "",
                "what is ": "what is|",
                "what are ": "what are|",
                "how do i ": "how do i|",
                "i need to ": "need to|",
                "i want to ": "want to|",
            }
            
            for pattern, marker in patterns.items():
                if query_lower.startswith(pattern):
                    # Extract the core query part
                    rewritten = query[len(pattern):].strip()
                    if rewritten and rewritten not in rewrites:
                        rewrites.append(rewritten)
                    break
            
            return rewrites[:self.max_expansions]
        except Exception as e:
            logger.error(f"Error during query rewriting: {e}")
            return [query]
    
    def decompose_query(self, query: str) -> List[str]:
        """
        Decompose complex queries into sub-queries.
        
        For queries with conjunctions/commas, splits into separate sub-queries.
        
        Args:
            query: Original query
        
        Returns:
            List of original and decomposed queries
        """
        if not self.enable_decomposition:
            return [query]
        
        try:
            decomposed = [query]  # Include original
            
            # Split on common conjunctions and punctuation
            if " and " in query.lower():
                parts = query.lower().split(" and ")
                for part in parts:
                    part = part.strip()
                    if part and part not in decomposed:
                        decomposed.append(part)
            
            if "," in query:
                parts = query.split(",")
                for part in parts:
                    part = part.strip()
                    if part and part not in decomposed:
                        decomposed.append(part)
            
            return decomposed[:self.max_expansions]
        except Exception as e:
            logger.error(f"Error during query decomposition: {e}")
            return [query]
    
    def expand_query(self, query: str) -> List[str]:
        """
        Perform full query expansion.
        
        Applies all enabled expansion techniques and returns deduplicated results.
        
        Args:
            query: Original query
        
        Returns:
            List of expanded queries (deduplicated, limited by max_expansions)
        """
        expansions = set([query])  # Start with original
        
        # Apply each expansion technique
        if self.enable_synonyms:
            expansions.update(self.expand_with_synonyms(query))
        
        if self.enable_rewriting:
            expansions.update(self.rewrite_query(query))
        
        if self.enable_decomposition:
            expansions.update(self.decompose_query(query))
        
        # Convert to list and limit
        result = list(expansions)[:self.max_expansions]
        
        logger.debug(f"Query expansion: '{query}' → {len(result)} variations")
        return result
    
    def set_custom_synonyms(self, synonyms: Dict[str, List[str]]) -> None:
        """
        Set custom synonyms dictionary.
        
        Args:
            synonyms: Dict mapping terms to their synonyms
        """
        self.synonyms = {**self.synonyms, **synonyms}
        logger.info(f"Updated synonyms dictionary with {len(synonyms)} entries")
    
    def get_config(self) -> dict:
        """Get query expansion configuration."""
        return {
            "enable_synonyms": self.enable_synonyms,
            "enable_rewriting": self.enable_rewriting,
            "enable_decomposition": self.enable_decomposition,
            "max_expansions": self.max_expansions,
            "num_synonyms_terms": len(self.synonyms),
        }
