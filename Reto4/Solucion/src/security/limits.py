"""Validacion de entrada de video: extension + tamano (P1, DoS/sandbox,
planeacion_v1.2.0.md Sec.9.1, CU-01.1 Pre, CU-06.2)."""

from __future__ import annotations

from pathlib import Path

from src.core.errors import IngestError


def validate_video_extension(video_path: Path, allowed_extensions: list[str]) -> None:
    allowed = {ext.lower() for ext in allowed_extensions}
    if video_path.suffix.lower() not in allowed:
        raise IngestError(
            f"extension '{video_path.suffix}' no permitida "
            f"(allowed_video_extensions={sorted(allowed)})"
        )


def validate_video_size(size_bytes: int, max_video_size_mb: int) -> None:
    max_bytes = max_video_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise IngestError(
            f"video de {size_bytes} bytes excede el limite de "
            f"{max_video_size_mb} MB (max_video_size_mb)"
        )
