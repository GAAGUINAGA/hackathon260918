"""Entrypoint del AnalyticsProcess: zonas + reglas -> eventos (CU-02.x).

Ata la salida del tracker (Fase 2) con el motor de zonas/reglas de esta
fase para producir `EventoTelemetria`. La integracion con
`src/core/pipeline.py` (reemplazar el `_run_analytics_process` stub de
Fase 1) se completa en Fase 4, cuando existen sinks
(`src/telemetry/sinks.py`) a los que entregar estos eventos: sin sink,
emitirlos en el pipeline real no tendria destino util todavia.
"""

from __future__ import annotations

from src.analytics.rules import RuleHandler, build_rule_handlers
from src.analytics.zones import Zone, build_zones, compute_person_zone_states
from src.telemetry.events import EventoTelemetria
from src.utils.config import CameraConfig

TrackTuple = tuple[int, tuple[float, float, float, float], float]


class AnalyticsEngine:
    def __init__(self, camera_config: CameraConfig) -> None:
        self._resolution = camera_config.resolution_target
        self._zones: list[Zone] = build_zones(camera_config)
        self._handlers: list[RuleHandler] = build_rule_handlers(camera_config)

    def process_frame(
        self,
        frame_idx: int,
        timestamp: float,
        tracks: list[TrackTuple],
    ) -> list[EventoTelemetria]:
        people = compute_person_zone_states(tracks, self._resolution, self._zones)
        events: list[EventoTelemetria] = []
        for handler in self._handlers:
            events.extend(handler.update(frame_idx, timestamp, people))
        return events
