"""Dispatcher multi-sink de telemetria (CU-03.1, P4 Sec.8.1).

Reparte cada evento a todos los sinks configurados. Un sink que falla al
emitir no bloquea a los demas (aislamiento entre sinks), pero el error
no se traga en silencio: se loggea y se re-lanza como `TelemetryError`
al terminar la ronda, para que el llamador aborte (fail-secure, P1
Sec.9.2) en vez de perder eventos sin que nadie se entere.
"""

from __future__ import annotations

from src.core.errors import TelemetryError
from src.telemetry.events import EventoTelemetria
from src.telemetry.sinks import TelemetrySink
from src.utils.logging import get_logger

logger = get_logger("telemetry.exporter")


class TelemetryExporter:
    def __init__(self, sinks: list[TelemetrySink]) -> None:
        self._sinks = sinks

    def emit(self, event: EventoTelemetria) -> None:
        errors: list[str] = []
        for sink in self._sinks:
            try:
                sink.emit(event)
            except Exception as exc:
                errors.append(f"{type(sink).__name__}: {exc}")
        if errors:
            logger.error(
                "fallo al emitir evento en uno o mas sinks",
                extra={"extra_fields": {"errors": errors}},
            )
            raise TelemetryError("; ".join(errors))

    def flush(self) -> None:
        for sink in self._sinks:
            sink.flush()

    def close(self) -> None:
        """Hace flush y cierra los sinks que expongan `close()` (best-effort)."""
        self.flush()
        for sink in self._sinks:
            close = getattr(sink, "close", None)
            if callable(close):
                close()
