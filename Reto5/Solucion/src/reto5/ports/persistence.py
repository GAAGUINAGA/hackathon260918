"""Puerto de persistencia de metadatos (SQLite WAL o Supabase/Postgres)."""

from __future__ import annotations

from typing import Any, Protocol


class MetadataRepoPort(Protocol):
    """Contrato compartido por los adaptadores de persistencia local y cloud."""

    async def guardar_documento(self, doc_id: str, datos: dict[str, Any]) -> None:
        """Inserta o actualiza el registro de un documento."""
        ...

    async def obtener_documento(self, doc_id: str) -> dict[str, Any] | None:
        """Devuelve el registro del documento o None si no existe."""
        ...

    async def registrar_auditoria(self, doc_id: str, etapa: str, decision: str) -> None:
        """Añade una entrada trazable en audit_log."""
        ...
