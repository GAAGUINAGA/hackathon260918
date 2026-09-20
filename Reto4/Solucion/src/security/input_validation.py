"""Validacion estricta de entradas y sandbox (P1, CU-06.2).

Ruta canonica: `src.utils.config.load_camera_config` (yaml.safe_load +
CameraConfig, Pydantic extra='forbid', CU-04.1). Esta funcion es un
alias delgado para que el codigo/tests que importan desde
`src.security.input_validation` (superficie "seguridad") usen la misma
implementacion, no una segunda ruta de carga.
"""

from __future__ import annotations

from pathlib import Path

from src.utils.config import CameraConfig, load_camera_config


def load_camera_config_yaml(config_path: Path) -> CameraConfig:
    return load_camera_config(config_path)
