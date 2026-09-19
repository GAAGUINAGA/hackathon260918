"""Validacion estricta de entradas y sandbox (P1, CU-06.2).

Stub de Fase 0.5. Implementacion completa en Fase 3 (src/utils/config.py,
src/analytics/process.py): yaml.safe_load, esquema Pydantic CameraConfig
con extra='forbid', allowlist de extensiones de video, rechazo explicito
de with_reid=true.
"""

from __future__ import annotations

from pathlib import Path


def load_camera_config_yaml(config_path: Path) -> dict[str, object]:
    """Debe cargar con yaml.safe_load y validar contra CameraConfig."""
    raise NotImplementedError("implementado en Fase 3 (CU-04.1, CU-06.2)")
