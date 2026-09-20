"""Puerto de procesamiento de lenguaje natural (NER, clasificación)."""

from __future__ import annotations

from typing import Protocol, TypedDict


class Entidad(TypedDict):
    texto: str
    etiqueta: str
    inicio: int
    fin: int


class NLPPort(Protocol):
    """Contrato para extracción de entidades y clasificación de texto."""

    def extraer_entidades(self, texto: str) -> list[Entidad]:
        """Devuelve las entidades nombradas encontradas en el texto."""
        ...

    def clasificar(self, texto: str) -> tuple[str, float]:
        """Devuelve (categoría, confianza) para el texto dado."""
        ...
