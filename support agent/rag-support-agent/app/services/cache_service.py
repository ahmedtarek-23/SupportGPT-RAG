"""
Redis-based caching service for responses and session memory.
"""

import json
import logging
import hashlib
from typing import Any, Optional
import redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class CacheService:
    """Service for caching responses and managing session data."""

    def __init__(self):
        settings = get_settings()
        self.enabled = settings.enable_caching
        self.ttl = settings.cache_ttl_seconds

        try:
            # Parse Redis URL and create client
            self.redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
            )
            # Test connection
            self.redis_client.ping()
            logger.info(f"Connected to Redis: {settings.redis_url}")
            self.available = True
        except Exception as e:
            logger.warning(f"Redis not available: {e}. Caching disabled.")
            self.redis_client = None
            self.available = False

    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """
        Generate a cache key from prefix and arguments.

        Args:
            prefix: Cache key prefix (e.g., 'query', 'session')
            **kwargs: Arguments to hash into the key

        Returns:
            Cache key string
        """
        # Create a deterministic hash of the arguments
        key_data = json.dumps(kwargs, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"{prefix}:{key_hash}"

    def get(self, key: str) -> Optional[dict]:
        """
        Retrieve value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value as dict, or None if not found
        """
        if not self.available:
            return None

        try:
            value = self.redis_client.get(key)
            if value:
                logger.debug(f"Cache hit: {key}")
                return json.loads(value)
            logger.debug(f"Cache miss: {key}")
            return None
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int | None = None) -> bool:
        """
        Store value in cache.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (uses default if None)

        Returns:
            True if successful, False otherwise
        """
        if not self.available:
            return False

        try:
            ttl = ttl or self.ttl
            serialized = json.dumps(value, default=str)
            self.redis_client.setex(key, ttl, serialized)
            logger.debug(f"Cache set: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete a cache key."""
        if not self.available:
            return False

        try:
            self.redis_client.delete(key)
            logger.debug(f"Cache deleted: {key}")
            return True
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False

    def clear_prefix(self, prefix: str) -> int:
        """
        Delete all keys with a given prefix.

        Args:
            prefix: Key prefix to delete

        Returns:
            Number of keys deleted
        """
        if not self.available:
            return 0

        try:
            keys = self.redis_client.keys(f"{prefix}:*")
            if keys:
                count = self.redis_client.delete(*keys)
                logger.info(f"Cleared {count} cache keys with prefix: {prefix}")
                return count
            return 0
        except Exception as e:
            logger.error(f"Error clearing cache prefix {prefix}: {e}")
            return 0

    def get_or_set(self, key: str, generator_fn, ttl: int | None = None) -> Optional[dict]:
        """
        Get from cache, or generate and cache if missing.

        Args:
            key: Cache key
            generator_fn: Function to call if cache miss
            ttl: Time to live in seconds

        Returns:
            Cached or generated value
        """
        # Try to get from cache
        cached = self.get(key)
        if cached is not None:
            return cached

        # Generate value
        try:
            value = generator_fn()
            if value:
                self.set(key, value, ttl=ttl)
            return value
        except Exception as e:
            logger.error(f"Error in generator function: {e}")
            return None
