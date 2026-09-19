"""Configuracion global del pipeline (CU-04.1, configs/default.yaml).

Carga con `yaml.safe_load` (nunca `eval`/`exec`, P1) y valida con Pydantic
en modo estricto (`extra="forbid"`). El esquema por-camara mas estricto
(zonas, reglas, tracker) llega en Fase 3 (CameraConfig).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from src.core.errors import ConfigError


class PipelineSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="forbid")

    inference_rate: int = Field(gt=0)
    resolution_target: tuple[int, int]
    max_video_size_mb: int = Field(gt=0)
    allowed_video_extensions: list[str]
    frame_queue_maxsize: int = Field(gt=0, default=5)


def load_pipeline_settings(path: Path) -> PipelineSettings:
    with path.open("r", encoding="utf-8") as fh:
        raw: Any = yaml.safe_load(fh) or {}
    if not isinstance(raw, dict):
        raise ConfigError(f"{path}: el YAML raiz debe ser un mapeo")
    return PipelineSettings(**raw)
