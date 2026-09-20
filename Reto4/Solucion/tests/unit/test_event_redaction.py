from __future__ import annotations

import logging

from src.telemetry.events import EventoTelemetria, emit_event, to_redacted_log_dict


def _event_with_metadata(metadata: dict[str, object]) -> EventoTelemetria:
    return EventoTelemetria(
        frame_idx=0,
        camera_id="cam_test",
        event_type="COUNT_SNAPSHOT",
        anchor_xy=(0.1, 0.1),
        metadata=metadata,
    )


def test_to_redacted_log_dict_redacts_pii_in_metadata_strings() -> None:
    event = _event_with_metadata(
        {
            "note": "operador ana@example.com revisando",
            "count": 3,
        }
    )

    payload = to_redacted_log_dict(event)
    metadata = payload["metadata"]
    assert isinstance(metadata, dict)

    assert "ana@example.com" not in metadata["note"]
    assert metadata["count"] == 3


def test_to_redacted_log_dict_keeps_structural_fields_intact() -> None:
    event = _event_with_metadata({})

    payload = to_redacted_log_dict(event)

    assert payload["camera_id"] == "cam_test"
    assert payload["event_type"] == "COUNT_SNAPSHOT"
    assert payload["frame_idx"] == 0


def test_no_pii_in_logs() -> None:
    logger = logging.getLogger("test.telemetry.redaction")
    event = _event_with_metadata({"note": "ip origen 192.168.1.42"})

    records: list[logging.LogRecord] = []
    handler = logging.Handler()
    handler.emit = records.append  # type: ignore[method-assign]
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    try:
        emit_event(event, logger)
    finally:
        logger.removeHandler(handler)

    assert len(records) == 1
    extra_fields = records[0].extra_fields  # type: ignore[attr-defined]
    assert "192.168.1.42" not in str(extra_fields)
    assert "<redacted>" in str(extra_fields)
