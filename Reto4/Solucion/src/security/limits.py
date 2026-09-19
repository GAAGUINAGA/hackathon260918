"""Limites de recursos (P1, DoS - planeacion_v1.2.0.md Sec.9.1, CU-01.1)."""

from __future__ import annotations

from src.core.errors import IngestError


def validate_video_size(size_bytes: int, max_video_size_mb: int) -> None:
    max_bytes = max_video_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise IngestError(
            f"video de {size_bytes} bytes excede el limite de "
            f"{max_video_size_mb} MB (max_video_size_mb)"
        )
