"""Puerto de fragmentación de texto para ventanas de contexto acotadas."""

from __future__ import annotations

from typing import Protocol


class ChunkerPort(Protocol):
    """Contrato para dividir texto largo en fragmentos procesables por el LLM."""

    def fragmentar(self, texto: str, *, tamano_maximo: int = 1000) -> list[str]:
        """Devuelve el texto dividido en fragmentos de tamaño acotado."""
        ...
