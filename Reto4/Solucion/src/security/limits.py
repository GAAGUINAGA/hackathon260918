"""Limites de recursos (P1, DoS - planeacion_v1.2.0.md Sec.9.1).

Stub de Fase 0.5. Implementacion completa en Fase 1 (src/core/reader.py,
src/core/pipeline.py): limite de tamano de video, timeout de join,
RLIMIT_AS para evitar OOM killer.
"""

from __future__ import annotations


def validate_video_size(size_bytes: int, max_video_size_mb: int) -> None:
    """Debe abortar (fail-secure) si size_bytes excede max_video_size_mb."""
    raise NotImplementedError("implementado en Fase 1 (CU-01.1)")
