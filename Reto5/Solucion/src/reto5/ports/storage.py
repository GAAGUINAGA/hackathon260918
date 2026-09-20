"""Puerto de almacenamiento de archivos (filesystem local o Supabase Storage)."""

from __future__ import annotations

from typing import Protocol


class StoragePort(Protocol):
    """Contrato compartido por LocalFileSystemStorage y SupabaseStorageAdapter."""

    def guardar(self, ruta_logica: str, contenido: bytes) -> None:
        """Persiste el contenido bajo la ruta lógica indicada."""
        ...

    def leer(self, ruta_logica: str) -> bytes:
        """Devuelve el contenido almacenado en la ruta lógica."""
        ...

    def mover(self, ruta_origen: str, ruta_destino: str) -> None:
        """Reubica un archivo ya almacenado (renombrado/organización)."""
        ...
