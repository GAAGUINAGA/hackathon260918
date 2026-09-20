"""Configuracion global del pipeline (CU-04.1, configs/default.yaml) y
configuracion estricta por camara (CameraConfig, configs/<camera>.yaml).

Carga con `yaml.safe_load` (nunca `eval`/`exec`, P1) y valida con Pydantic
en modo estricto (`extra="forbid"`).
"""

from __future__ import annotations

from pathlib import Path
from typing import Annotated, Any, Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator
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


UnitCoord = Annotated[float, Field(ge=0.0, le=1.0)]
Point2D = tuple[UnitCoord, UnitCoord]


class ModelConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    path: str = Field(min_length=1)
    sha256: str = Field(min_length=1)
    device: str = "CPU"


class TrackerConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    algorithm: Literal["bytetrack"] = "bytetrack"
    track_buffer: int = Field(gt=0, default=60)
    match_thresh: float = Field(gt=0.0, le=1.0, default=0.8)
    with_reid: bool = False

    @field_validator("with_reid")
    @classmethod
    def _reject_reid(cls, value: bool) -> bool:
        if value:
            raise ValueError(
                "with_reid=true prohibido (P1): sin ReID -> sin datos biometricos"
            )
        return value


class SecurityConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_signature_required: bool = True
    allowed_video_extensions: list[str]
    max_video_size_mb: int = Field(gt=0)
    yaml_sandbox: bool = True


class PrivacyConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    blur_faces: bool = False
    keep_frames: bool = False


class PolygonZoneConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    type: Literal["exclusion", "count", "intrusion"]
    polygon: list[Point2D] = Field(min_length=3)


class DwellZoneConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    type: Literal["dwell"]
    polygon: list[Point2D] = Field(min_length=3)
    min_time_seconds: float = Field(gt=0)
    dwell_rearm_seconds: float = Field(default=0.0, ge=0.0)


class LineCrossingZoneConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    type: Literal["line_crossing"]
    line: list[Point2D] = Field(min_length=2, max_length=2)
    direction: Literal["in", "out", "any"] = "any"


ZoneConfig = Annotated[
    PolygonZoneConfig | DwellZoneConfig | LineCrossingZoneConfig,
    Field(discriminator="type"),
]


class CameraConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    camera_id: str = Field(min_length=1)
    resolution_target: tuple[int, int]
    inference_rate: int = Field(gt=0)
    confidence_threshold: float = Field(ge=0.0, le=1.0)
    iou_threshold: float = Field(ge=0.0, le=1.0)
    model: ModelConfig
    tracker: TrackerConfig
    security: SecurityConfig
    privacy: PrivacyConfig
    zones: list[ZoneConfig] = Field(default_factory=list)


def load_camera_config(path: Path) -> CameraConfig:
    with path.open("r", encoding="utf-8") as fh:
        raw: Any = yaml.safe_load(fh) or {}
    if not isinstance(raw, dict):
        raise ConfigError(f"{path}: el YAML raiz debe ser un mapeo")
    return CameraConfig(**raw)
