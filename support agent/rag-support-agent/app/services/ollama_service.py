"""
Ollama LLM Service

Thin wrapper around Ollama's OpenAI-compatible API.
Provides a drop-in replacement for the OpenAI client used throughout the app.

Usage:
    from app.services.ollama_service import get_ollama_client
    client = get_ollama_client()
    # Use exactly like openai.OpenAI client
    response = client.chat.completions.create(model="llama3", messages=[...])

Requires Ollama running locally:
    - Install: https://ollama.ai
    - Pull model: ollama pull llama3
    - Start: ollama serve (runs on port 11434 by default)
"""

import logging
import httpx
from openai import OpenAI
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def get_ollama_client() -> OpenAI:
    """
    Return an OpenAI client pointed at the local Ollama instance.

    Ollama exposes an OpenAI-compatible REST API at /v1, so all existing
    code using openai.OpenAI works without modification — just swap the
    base_url and use the local model name instead of gpt-3.5-turbo.
    """
    settings = get_settings()
    client = OpenAI(
        api_key=settings.openai_api_key,   # "ollama" — required but ignored
        base_url=settings.ollama_base_url,  # http://localhost:11434/v1
    )
    logger.debug(f"Ollama client created: {settings.ollama_base_url} model={settings.ollama_model}")
    return client


def get_active_model() -> str:
    """Return the currently configured model name."""
    return get_settings().ollama_model


def is_ollama_available() -> bool:
    """Quick health check — returns True if Ollama is reachable."""
    settings = get_settings()
    # base_url ends with /v1, root is at /api/tags
    root = settings.ollama_base_url.replace("/v1", "")
    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(f"{root}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False
