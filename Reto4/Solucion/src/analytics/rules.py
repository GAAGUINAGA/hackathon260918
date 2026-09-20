"""Motor de reglas de negocio: dwell, count, line_crossing, intrusion
(CU-02.2, CU-02.3, CU-02.4). `exclusion` no necesita RuleHandler: ya se
resuelve en `zones.compute_person_zone_states` (descarta a la persona).

`RuleHandler` es la interfaz de extension (CU-07.2): un nuevo tipo de
regla solo necesita una clase con `update()` + registrarse en
`build_rule_handlers`; no toca pipeline.py ni el resto de handlers.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, Protocol

from shapely.geometry import LineString, Polygon

from src.analytics.zones import PersonZoneState
from src.telemetry.events import EventoTelemetria
from src.utils.config import (
    CameraConfig,
    DwellZoneConfig,
    LineCrossingZoneConfig,
    PolygonZoneConfig,
)


def _to_datetime(timestamp: float) -> datetime:
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


class RuleHandler(Protocol):
    def update(
        self, frame_idx: int, timestamp: float, people: list[PersonZoneState]
    ) -> list[EventoTelemetria]: ...


@dataclass
class _DwellState:
    entry_ts: float
    emitted: bool
    last_seen_frame: int
    last_anchor_xy: tuple[float, float]
    last_confidence: float


class DwellRuleHandler:
    """Maquina de estados de permanencia con histeresis (CU-02.4)."""

    def __init__(
        self,
        zone: DwellZoneConfig,
        camera_id: str,
        track_buffer_frames: int = 60,
    ) -> None:
        self._zone = zone
        self._camera_id = camera_id
        self._track_buffer_frames = track_buffer_frames
        self._states: dict[int, _DwellState] = {}
        self._last_exit_ts: dict[int, float] = {}

    def update(
        self, frame_idx: int, timestamp: float, people: list[PersonZoneState]
    ) -> list[EventoTelemetria]:
        events: list[EventoTelemetria] = []
        people_by_id = {p.track_id: p for p in people}

        for person in people:
            if self._zone.name not in person.in_zones:
                continue

            state = self._states.get(person.track_id)
            if state is None:
                last_exit = self._last_exit_ts.get(person.track_id)
                if (
                    last_exit is not None
                    and timestamp - last_exit < self._zone.dwell_rearm_seconds
                ):
                    continue  # en periodo de rearm: no reinicia estado (CU-02.4 pt.4)
                self._states[person.track_id] = _DwellState(
                    entry_ts=timestamp,
                    emitted=False,
                    last_seen_frame=frame_idx,
                    last_anchor_xy=person.anchor_xy,
                    last_confidence=person.confidence,
                )
                continue

            state.last_seen_frame = frame_idx
            state.last_anchor_xy = person.anchor_xy
            state.last_confidence = person.confidence
            duration = timestamp - state.entry_ts
            if not state.emitted and duration >= self._zone.min_time_seconds:
                state.emitted = True
                events.append(
                    self._event(
                        person.track_id,
                        frame_idx,
                        timestamp,
                        "threshold",
                        duration,
                        person.anchor_xy,
                        person.confidence,
                    )
                )

        for track_id in list(self._states.keys()):
            state = self._states[track_id]
            maybe_person = people_by_id.get(track_id)
            still_inside = (
                maybe_person is not None and self._zone.name in maybe_person.in_zones
            )
            if still_inside:
                continue

            timed_out = maybe_person is None and (
                frame_idx - state.last_seen_frame > self._track_buffer_frames
            )
            left_zone = maybe_person is not None and not still_inside
            if not (timed_out or left_zone):
                continue  # ausente pero aun dentro de la tolerancia de track_buffer

            del self._states[track_id]
            self._last_exit_ts[track_id] = timestamp
            if state.emitted:
                duration = timestamp - state.entry_ts
                events.append(
                    self._event(
                        track_id,
                        frame_idx,
                        timestamp,
                        "exit",
                        duration,
                        state.last_anchor_xy,
                        state.last_confidence,
                    )
                )

        return events

    def _event(
        self,
        track_id: int,
        frame_idx: int,
        timestamp: float,
        phase: str,
        duration: float,
        anchor_xy: tuple[float, float],
        confidence: float,
    ) -> EventoTelemetria:
        return EventoTelemetria(
            frame_idx=frame_idx,
            timestamp_utc=_to_datetime(timestamp),
            camera_id=self._camera_id,
            event_type="DWELL_TRIGGER",
            track_id=track_id,
            zone_name=self._zone.name,
            dwell_seconds=duration,
            confidence=confidence,
            anchor_xy=anchor_xy,
            metadata={"phase": phase},
        )


class CountRuleHandler:
    """Conteo y aforo por zona con snapshot por intervalo o cambio (CU-02.2)."""

    def __init__(
        self,
        zone: PolygonZoneConfig,
        centroid: tuple[float, float],
        camera_id: str,
        snapshot_interval_seconds: float = 1.0,
        max_nominal: int = 25,
    ) -> None:
        self._zone = zone
        self._centroid = centroid
        self._camera_id = camera_id
        self._snapshot_interval = snapshot_interval_seconds
        self._max_nominal = max_nominal
        self._last_snapshot_ts: float | None = None
        self._last_count: int | None = None
        self._cumulative_max = 0

    def update(
        self, frame_idx: int, timestamp: float, people: list[PersonZoneState]
    ) -> list[EventoTelemetria]:
        current_count = sum(1 for p in people if self._zone.name in p.in_zones)
        self._cumulative_max = max(self._cumulative_max, current_count)

        should_snapshot = (
            self._last_snapshot_ts is None
            or (timestamp - self._last_snapshot_ts) >= self._snapshot_interval
            or current_count != self._last_count
        )
        if not should_snapshot:
            return []

        self._last_snapshot_ts = timestamp
        self._last_count = current_count
        return [
            EventoTelemetria(
                frame_idx=frame_idx,
                timestamp_utc=_to_datetime(timestamp),
                camera_id=self._camera_id,
                event_type="COUNT_SNAPSHOT",
                zone_name=self._zone.name,
                anchor_xy=self._centroid,
                metadata={
                    "current_count": current_count,
                    "cumulative_max": self._cumulative_max,
                    "degraded": current_count > self._max_nominal,
                },
            )
        ]


class IntrusionRuleHandler:
    """Alerta de intrusion, disparada al entrar (edge-triggered, sin umbral)."""

    def __init__(self, zone: PolygonZoneConfig, camera_id: str) -> None:
        self._zone = zone
        self._camera_id = camera_id
        self._active_track_ids: set[int] = set()

    def update(
        self, frame_idx: int, timestamp: float, people: list[PersonZoneState]
    ) -> list[EventoTelemetria]:
        events: list[EventoTelemetria] = []
        present: set[int] = set()
        for person in people:
            if self._zone.name not in person.in_zones:
                continue
            present.add(person.track_id)
            if person.track_id in self._active_track_ids:
                continue
            events.append(
                EventoTelemetria(
                    frame_idx=frame_idx,
                    timestamp_utc=_to_datetime(timestamp),
                    camera_id=self._camera_id,
                    event_type="INTRUSION_ALERT",
                    track_id=person.track_id,
                    zone_name=self._zone.name,
                    confidence=person.confidence,
                    anchor_xy=person.anchor_xy,
                )
            )
        self._active_track_ids = present
        return events


class LineCrossingRuleHandler:
    """Cruce de linea con direccion y descarte de saltos grandes (CU-02.3)."""

    def __init__(
        self,
        zone: LineCrossingZoneConfig,
        camera_id: str,
        max_jump_distance: float = 0.5,
    ) -> None:
        self._zone = zone
        self._camera_id = camera_id
        self._max_jump_distance = max_jump_distance
        self._line = LineString(zone.line)
        self._prev_anchor: dict[int, tuple[float, float]] = {}
        self._counts = {"in": 0, "out": 0}

    def update(
        self, frame_idx: int, timestamp: float, people: list[PersonZoneState]
    ) -> list[EventoTelemetria]:
        events: list[EventoTelemetria] = []
        seen_ids: set[int] = set()

        for person in people:
            seen_ids.add(person.track_id)
            prev = self._prev_anchor.get(person.track_id)
            self._prev_anchor[person.track_id] = person.anchor_xy
            if prev is None:
                continue

            jump = math.dist(prev, person.anchor_xy)
            if jump > self._max_jump_distance:
                continue  # CU-02.3 FE-01: salto grande (oclusion), descartar

            movement = LineString([prev, person.anchor_xy])
            if not movement.intersects(self._line):
                continue

            direction = self._crossing_direction(prev, person.anchor_xy)
            self._counts[direction] += 1

            if self._zone.direction != "any" and self._zone.direction != direction:
                continue  # CU-02.3 FA-01: direccion no configurada, no se emite

            events.append(
                EventoTelemetria(
                    frame_idx=frame_idx,
                    timestamp_utc=_to_datetime(timestamp),
                    camera_id=self._camera_id,
                    event_type="LINE_CROSSING",
                    track_id=person.track_id,
                    zone_name=self._zone.name,
                    confidence=person.confidence,
                    anchor_xy=person.anchor_xy,
                    metadata={
                        "direction": direction,
                        "count_in": self._counts["in"],
                        "count_out": self._counts["out"],
                    },
                )
            )

        for track_id in list(self._prev_anchor.keys()):
            if track_id not in seen_ids:
                del self._prev_anchor[track_id]

        return events

    def _crossing_direction(
        self, prev: tuple[float, float], curr: tuple[float, float]
    ) -> Literal["in", "out"]:
        (lx0, ly0), (lx1, ly1) = self._zone.line
        line_dx, line_dy = lx1 - lx0, ly1 - ly0
        move_dx, move_dy = curr[0] - prev[0], curr[1] - prev[1]
        cross = line_dx * move_dy - line_dy * move_dx
        return "in" if cross > 0 else "out"


def build_rule_handlers(camera_config: CameraConfig) -> list[RuleHandler]:
    handlers: list[RuleHandler] = []
    for zone_cfg in camera_config.zones:
        if isinstance(zone_cfg, DwellZoneConfig):
            handlers.append(
                DwellRuleHandler(
                    zone_cfg,
                    camera_config.camera_id,
                    camera_config.tracker.track_buffer,
                )
            )
        elif isinstance(zone_cfg, LineCrossingZoneConfig):
            handlers.append(LineCrossingRuleHandler(zone_cfg, camera_config.camera_id))
        elif zone_cfg.type == "count":
            centroid = Polygon(zone_cfg.polygon).centroid
            handlers.append(
                CountRuleHandler(
                    zone_cfg, (centroid.x, centroid.y), camera_config.camera_id
                )
            )
        elif zone_cfg.type == "intrusion":
            handlers.append(IntrusionRuleHandler(zone_cfg, camera_config.camera_id))
        # "exclusion": sin RuleHandler, ya resuelto en zones.compute_person_zone_states
    return handlers
