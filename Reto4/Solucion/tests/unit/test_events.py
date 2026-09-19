from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

import pytest
from pydantic import ValidationError

from src.telemetry.events import EventoTelemetria


def _valid_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "frame_idx": 42,
        "camera_id": "cam_office_main",
        "event_type": "DWELL_TRIGGER",
        "track_id": 7,
        "zone_name": "zona_cafeteria",
        "dwell_seconds": 15.5,
        "confidence": 0.91,
        "anchor_xy": (0.5, 0.9),
        "metadata": {"phase": "threshold"},
    }
    payload.update(overrides)
    return payload


def test_valid_event_populates_defaults() -> None:
    event = EventoTelemetria(**_valid_payload())

    assert isinstance(event.event_id, UUID)
    assert event.timestamp_utc.tzinfo is not None
    assert event.frame_idx == 42
    assert event.camera_id == "cam_office_main"


def test_event_type_rejects_unknown_literal() -> None:
    with pytest.raises(ValidationError):
        EventoTelemetria(**_valid_payload(event_type="UNKNOWN_EVENT"))


@pytest.mark.parametrize("frame_idx", [-1, -100])
def test_frame_idx_must_be_non_negative(frame_idx: int) -> None:
    with pytest.raises(ValidationError):
        EventoTelemetria(**_valid_payload(frame_idx=frame_idx))


@pytest.mark.parametrize("confidence", [-0.01, 1.01, 2.0])
def test_confidence_must_be_within_unit_range(confidence: float) -> None:
    with pytest.raises(ValidationError):
        EventoTelemetria(**_valid_payload(confidence=confidence))


@pytest.mark.parametrize("anchor_xy", [(-0.1, 0.5), (0.5, 1.5), (1.1, 1.1)])
def test_anchor_xy_must_be_normalized(anchor_xy: tuple[float, float]) -> None:
    with pytest.raises(ValidationError):
        EventoTelemetria(**_valid_payload(anchor_xy=anchor_xy))


def test_camera_id_cannot_be_empty() -> None:
    with pytest.raises(ValidationError):
        EventoTelemetria(**_valid_payload(camera_id=""))


def test_zone_name_empty_string_is_rejected() -> None:
    with pytest.raises(ValidationError):
        EventoTelemetria(**_valid_payload(zone_name=""))


def test_timestamp_utc_rejects_naive_datetime() -> None:
    with pytest.raises(ValidationError):
        EventoTelemetria(**_valid_payload(timestamp_utc=datetime(2026, 1, 1)))


def test_timestamp_utc_accepts_timezone_aware_datetime() -> None:
    ts = datetime(2026, 1, 1, tzinfo=timezone.utc)
    event = EventoTelemetria(**_valid_payload(timestamp_utc=ts))

    assert event.timestamp_utc == ts


def test_optional_fields_default_to_none_or_empty() -> None:
    event = EventoTelemetria(
        frame_idx=0,
        camera_id="cam_office_main",
        event_type="COUNT_SNAPSHOT",
        anchor_xy=(0.0, 0.0),
    )

    assert event.track_id is None
    assert event.zone_name is None
    assert event.dwell_seconds is None
    assert event.confidence is None
    assert event.metadata == {}


def test_unknown_fields_are_rejected() -> None:
    with pytest.raises(ValidationError):
        EventoTelemetria(**_valid_payload(unexpected_field="not-allowed"))


def test_event_is_immutable() -> None:
    event = EventoTelemetria(**_valid_payload())

    with pytest.raises(ValidationError):
        event.frame_idx = 999  # type: ignore[misc]
