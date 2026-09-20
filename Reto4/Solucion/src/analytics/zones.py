"""Anclaje inferior y pertenencia a zonas (CU-02.1).

Flujo: 1) anclaje inferior en espacio de pixeles, 2) normalizacion a
[0,1] segun resolucion, 3) pertenencia a zonas via Shapely
(`Polygon.contains`, que excluye la frontera por diseno -> FA-01:
"ancla sobre frontera se considera fuera"), 4) descarte de personas
cuyo ancla cae en una zona `exclusion` (no siguen en el pipeline).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from shapely.geometry import Point, Polygon

from src.utils.config import CameraConfig, LineCrossingZoneConfig

logger = logging.getLogger(__name__)


def compute_bottom_anchor_px(
    bbox_xyxy: tuple[float, float, float, float],
) -> tuple[float, float]:
    x1, y1, x2, y2 = bbox_xyxy
    return ((x1 + x2) / 2.0, y2)


def normalize_anchor(
    anchor_px: tuple[float, float], resolution: tuple[int, int]
) -> tuple[float, float]:
    width, height = resolution
    x, y = anchor_px
    return (x / width, y / height)


def clamp_to_unit_range(point: tuple[float, float]) -> tuple[float, float]:
    x, y = point
    clamped = (min(max(x, 0.0), 1.0), min(max(y, 0.0), 1.0))
    if clamped != point:
        logger.warning("anchor fuera de [0,1], clamped: %s -> %s", point, clamped)
    return clamped


@dataclass(frozen=True)
class Zone:
    name: str
    zone_type: str
    polygon: Polygon


def build_zones(camera_config: CameraConfig) -> list[Zone]:
    """Construye las zonas poligonales (exclusion/dwell/count/intrusion).

    Las zonas `line_crossing` no tienen polygon; las maneja directamente
    `LineCrossingRuleHandler` (src/analytics/rules.py).
    """
    zones = []
    for zone_cfg in camera_config.zones:
        if isinstance(zone_cfg, LineCrossingZoneConfig):
            continue
        zones.append(
            Zone(
                name=zone_cfg.name,
                zone_type=zone_cfg.type,
                polygon=Polygon(zone_cfg.polygon),
            )
        )
    return zones


@dataclass(frozen=True)
class PersonZoneState:
    track_id: int
    anchor_xy: tuple[float, float]
    confidence: float
    in_zones: tuple[str, ...]


def _zones_containing(point: Point, zones: list[Zone]) -> tuple[str, ...]:
    return tuple(
        zone.name
        for zone in zones
        if zone.zone_type != "exclusion" and zone.polygon.contains(point)
    )


def _is_excluded(point: Point, zones: list[Zone]) -> bool:
    return any(
        zone.zone_type == "exclusion" and zone.polygon.contains(point) for zone in zones
    )


def compute_person_zone_states(
    tracks: list[tuple[int, tuple[float, float, float, float], float]],
    resolution: tuple[int, int],
    zones: list[Zone],
) -> list[PersonZoneState]:
    """Calcula el estado de zona por persona; descarta las excluidas.

    `tracks` es una lista de `(track_id, bbox_xyxy_px, confidence)`, tal
    como los produce `src.ai.tracker.TrackedPerson`.
    """
    states = []
    for track_id, bbox_xyxy, confidence in tracks:
        anchor_px = compute_bottom_anchor_px(bbox_xyxy)
        anchor = clamp_to_unit_range(normalize_anchor(anchor_px, resolution))
        point = Point(anchor)
        if _is_excluded(point, zones):
            continue
        states.append(
            PersonZoneState(
                track_id=track_id,
                anchor_xy=anchor,
                confidence=confidence,
                in_zones=_zones_containing(point, zones),
            )
        )
    return states
