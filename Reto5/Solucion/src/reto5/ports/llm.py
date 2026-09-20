"""Puerto para modelos de lenguaje (local u remoto)."""

from __future__ import annotations

from typing import Protocol


class LLMPort(Protocol):
    """Contrato para invocar un LLM (Ollama, OpenAI, Anthropic, Gemini)."""

    async def completar(self, prompt: str, *, max_tokens: int = 512) -> str:
        """Devuelve la respuesta del modelo para el prompt dado."""
        ...
