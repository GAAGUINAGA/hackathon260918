"""Dispatcher multi-sink de telemetria (CU-03.1, P4 Sec.8.1).

Reparte cada evento (`emit`) y cada flush (`flush`) a todos los sinks
configurados con la misma disciplina: un sink que falla no bloquea a los
demas (aislamiento entre sinks), pero el error no se traga en silencio
-- se loggea y se re-lanza como `TelemetryError` al terminar la ronda,
para que el llamador aborte (fail-secure, P1 Sec.9.2) en vez de perder
eventos/datos sin que nadie se entere.
"""

from __future__ import annotations

from collections.abc import Callable

from src.core.errors import TelemetryError
from src.telemetry.events import EventoTelemetria
from src.telemetry.sinks import TelemetrySink
from src.utils.logging import get_logger

logger = get_logger("telemetry.exporter")


class TelemetryExporter:
    def __init__(self, sinks: list[TelemetrySink]) -> None:
        self._sinks = sinks

    def emit(self, event: EventoTelemetria) -> None:
        self._dispatch("emitir evento", lambda sink: sink.emit(event))

    def flush(self) -> None:
        self._dispatch("hacer flush", lambda sink: sink.flush())

    def close(self) -> None:
        """Hace flush y cierra los sinks que expongan `close()`.

        Intenta cerrar todos los sinks aunque el flush de alguno falle
        (evita fugar file handles/conexiones); si hubo error de flush, se
        re-lanza al final, una vez cerrados los que se pudieron cerrar.
        """
        flush_error: TelemetryError | None = None
        try:
            self.flush()
        except TelemetryError as exc:
            flush_error = exc

        for sink in self._sinks:
            close = getattr(sink, "close", None)
            if callable(close):
                close()

        if flush_error is not None:
            raise flush_error

    def _dispatch(self, action: str, run: Callable[[TelemetrySink], None]) -> None:
        errors: list[str] = []
        for sink in self._sinks:
            try:
                run(sink)
            except Exception as exc:
                errors.append(f"{type(sink).__name__}: {exc}")
        if errors:
            logger.error(
                f"fallo al {action} en uno o mas sinks",
                extra={"extra_fields": {"errors": errors}},
            )
            raise TelemetryError("; ".join(errors))
