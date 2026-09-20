from __future__ import annotations

import pytest

from src.core.errors import TelemetryError
from src.telemetry.events import EventoTelemetria
from src.telemetry.exporter import TelemetryExporter


class _RecordingSink:
    def __init__(self) -> None:
        self.emitted: list[EventoTelemetria] = []
        self.flushed = False
        self.closed = False

    def emit(self, event: EventoTelemetria) -> None:
        self.emitted.append(event)

    def flush(self) -> None:
        self.flushed = True

    def close(self) -> None:
        self.closed = True


class _NoCloseSink:
    """Sink minimo: solo implementa el protocolo (emit/flush), sin close()."""

    def __init__(self) -> None:
        self.emitted: list[EventoTelemetria] = []

    def emit(self, event: EventoTelemetria) -> None:
        self.emitted.append(event)

    def flush(self) -> None:
        pass


class _FailingSink:
    def emit(self, event: EventoTelemetria) -> None:
        raise RuntimeError("disco lleno")

    def flush(self) -> None:
        pass


class _FailingFlushSink:
    def __init__(self) -> None:
        self.closed = False

    def emit(self, event: EventoTelemetria) -> None:
        pass

    def flush(self) -> None:
        raise OSError("disco lleno")

    def close(self) -> None:
        self.closed = True


def _sample_event() -> EventoTelemetria:
    return EventoTelemetria(
        frame_idx=0,
        camera_id="cam_test",
        event_type="COUNT_SNAPSHOT",
        anchor_xy=(0.5, 0.5),
    )


def test_exporter_emits_to_all_sinks() -> None:
    sink_a, sink_b = _RecordingSink(), _RecordingSink()
    exporter = TelemetryExporter([sink_a, sink_b])
    event = _sample_event()

    exporter.emit(event)

    assert sink_a.emitted == [event]
    assert sink_b.emitted == [event]


def test_exporter_isolates_a_failing_sink_from_the_others_but_raises() -> None:
    healthy = _RecordingSink()
    exporter = TelemetryExporter([_FailingSink(), healthy])
    event = _sample_event()

    with pytest.raises(TelemetryError):
        exporter.emit(event)

    assert healthy.emitted == [event]


def test_exporter_flush_calls_flush_on_every_sink() -> None:
    sink_a, sink_b = _RecordingSink(), _RecordingSink()
    exporter = TelemetryExporter([sink_a, sink_b])

    exporter.flush()

    assert sink_a.flushed
    assert sink_b.flushed


def test_exporter_close_flushes_and_closes_sinks_that_support_it() -> None:
    with_close = _RecordingSink()
    without_close = _NoCloseSink()
    exporter = TelemetryExporter([with_close, without_close])

    exporter.close()  # no debe fallar aunque un sink no tenga close()

    assert with_close.flushed
    assert with_close.closed


def test_exporter_flush_isolates_a_failing_sink_from_the_others_but_raises() -> None:
    healthy = _RecordingSink()
    exporter = TelemetryExporter([_FailingFlushSink(), healthy])

    with pytest.raises(TelemetryError):
        exporter.flush()

    assert healthy.flushed


def test_exporter_close_still_closes_every_sink_when_a_flush_fails() -> None:
    failing = _FailingFlushSink()
    healthy = _RecordingSink()
    exporter = TelemetryExporter([failing, healthy])

    with pytest.raises(TelemetryError):
        exporter.close()

    assert failing.closed
    assert healthy.closed
