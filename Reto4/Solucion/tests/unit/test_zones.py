from __future__ import annotations

from shapely.geometry import Polygon

from src.analytics.zones import (
    Zone,
    clamp_to_unit_range,
    compute_bottom_anchor_px,
    compute_person_zone_states,
    normalize_anchor,
)


def test_compute_bottom_anchor_px_uses_center_x_and_bottom_y() -> None:
    anchor = compute_bottom_anchor_px((10.0, 20.0, 30.0, 80.0))

    assert anchor == (20.0, 80.0)


def test_normalize_anchor_divides_by_resolution() -> None:
    anchor = normalize_anchor((320.0, 640.0), (640, 640))

    assert anchor == (0.5, 1.0)


def test_clamp_to_unit_range_clamps_out_of_bounds_values() -> None:
    assert clamp_to_unit_range((-0.1, 1.5)) == (0.0, 1.0)
    assert clamp_to_unit_range((0.5, 0.5)) == (0.5, 0.5)


def _square_zone(name: str, zone_type: str) -> Zone:
    return Zone(
        name=name,
        zone_type=zone_type,
        polygon=Polygon([(0.2, 0.2), (0.8, 0.2), (0.8, 0.8), (0.2, 0.8)]),
    )


def test_compute_person_zone_states_reports_membership() -> None:
    zones = [_square_zone("centro", "count")]
    tracks = [(1, (300.0, 300.0, 340.0, 380.0), 0.9)]

    states = compute_person_zone_states(tracks, (640, 640), zones)

    assert len(states) == 1
    assert states[0].track_id == 1
    assert "centro" in states[0].in_zones


def test_compute_person_zone_states_excludes_people_in_exclusion_zone() -> None:
    zones = [_square_zone("prohibida", "exclusion")]
    tracks = [(1, (300.0, 300.0, 340.0, 380.0), 0.9)]

    states = compute_person_zone_states(tracks, (640, 640), zones)

    assert states == []


def test_compute_person_zone_states_boundary_anchor_is_outside() -> None:
    # Ancla exactamente en el borde izquierdo (x=0.2) -> Polygon.contains la
    # considera fuera (determinismo, CU-02.1 FA-01).
    zones = [_square_zone("centro", "count")]
    tracks = [(1, (128.0, 300.0, 128.0, 300.0), 0.9)]

    states = compute_person_zone_states(tracks, (640, 640), zones)

    assert states[0].in_zones == ()
