"""Verificacion de integridad de artefactos (P1, CU-06.1).

Stub de Fase 0.5. Implementacion completa en Fase 2 (src/ai/detector.py):
lectura de SHA256SUMS, calculo de hash del artefacto, comparacion en
tiempo constante, fail-secure si no coincide o el archivo esta ausente.
"""

from __future__ import annotations

from pathlib import Path


def verify_sha256(artifact_path: Path, sha256sums_path: Path) -> None:
    """Debe abortar (fail-secure) si el hash del artefacto no coincide."""
    raise NotImplementedError("implementado en Fase 2 (CU-06.1)")
