from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.security.log_redaction import redact

EventType = Literal[
    "DWELL_TRIGGER",
    "LINE_CROSSING",
    "COUNT_SNAPSHOT",
    "INTRUSION_ALERT",
]


class EventoTelemetria(BaseModel):
    """Contrato de evento de telemetria (CU-03.1, planeacion_v1.2.0.md Sec.6).

    Inmutable: un evento emitido no se modifica, solo se re-emite; esto
    sostiene la mitigacion de Repudiation del threat model (Sec.9.1).
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    event_id: UUID = Field(default_factory=uuid4)
    timestamp_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    frame_idx: int = Field(ge=0)
    camera_id: str = Field(min_length=1)
    event_type: EventType
    track_id: int | None = Field(default=None, ge=0)
    zone_name: str | None = Field(default=None, min_length=1)
    dwell_seconds: float | None = Field(default=None, ge=0.0)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    anchor_xy: tuple[float, float]
    metadata: dict[str, object] = Field(default_factory=dict)

    @field_validator("anchor_xy")
    @classmethod
    def _anchor_xy_normalized(cls, value: tuple[float, float]) -> tuple[float, float]:
        x, y = value
        if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
            raise ValueError("anchor_xy debe estar normalizado en [0.0, 1.0]")
        return value

    @field_validator("timestamp_utc")
    @classmethod
    def _timestamp_is_timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("timestamp_utc debe ser timezone-aware (UTC)")
        return value

    @field_validator("camera_id", "zone_name")
    @classmethod
    def _no_surrounding_whitespace(cls, value: str | None) -> str | None:
        if value is not None and value != value.strip():
            raise ValueError("el valor no debe tener espacios al inicio/final")
        return value


def _redact_metadata(metadata: dict[str, object]) -> dict[str, object]:
    return {
        key: redact(value) if isinstance(value, str) else value
        for key, value in metadata.items()
    }


def to_redacted_log_dict(event: EventoTelemetria) -> dict[str, object]:
    """Serializa `event` para logging, con PII redactada de `metadata`.

    Los campos estructurales (`camera_id`, `zone_name`) son identificadores
    de configuracion, no PII; solo `metadata` es de origen libre (rellenado
    por los `RuleHandler`) y se redacta campo a campo (P1 Sec.9.1,
    Information disclosure).
    """
    payload = event.model_dump(mode="json")
    payload["metadata"] = _redact_metadata(event.metadata)
    return payload


def emit_event(event: EventoTelemetria, logger: logging.Logger) -> None:
    """Registra `event` en `logger` (formato JSON estructurado) con PII redactada."""
    logger.info(
        "evento_telemetria", extra={"extra_fields": to_redacted_log_dict(event)}
    )
