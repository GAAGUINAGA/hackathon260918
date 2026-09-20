"""Puerto de reconocimiento óptico de caracteres."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol


class OCRPort(Protocol):
    """Contrato para extraer texto de documentos escaneados o basados en imagen."""

    def extraer_texto(self, ruta: Path) -> str:
        """Devuelve el texto reconocido en el archivo dado."""
        ...
