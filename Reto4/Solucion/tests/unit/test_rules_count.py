from __future__ import annotations

from src.analytics.rules import CountRuleHandler
from src.analytics.zones import PersonZoneState
from src.utils.config import PolygonZoneConfig

ZONE_NAME = "lobby"


def _zone() -> PolygonZoneConfig:
    return PolygonZoneConfig(
        name=ZONE_NAME, type="count", polygon=[(0.0, 0.0), (1.0, 0.0), (1.0, 1.0)]
    )


def _state(track_id: int, in_zone: bool) -> PersonZoneState:
    return PersonZoneState(
        track_id=track_id,
        anchor_xy=(0.3, 0.3),
        confidence=0.9,
        in_zones=(ZONE_NAME,) if in_zone else (),
    )


def test_count_snapshots_on_first_call() -> None:
    handler = CountRuleHandler(
        _zone(), centroid=(0.5, 0.5), camera_id="cam1", snapshot_interval_seconds=1.0
    )

    events = handler.update(0, timestamp=0.0, people=[_state(1, True), _state(2, True)])

    assert len(events) == 1
    assert events[0].event_type == "COUNT_SNAPSHOT"
    assert events[0].metadata["current_count"] == 2


def test_count_snapshots_immediately_on_count_change() -> None:
    handler = CountRuleHandler(
        _zone(), centroid=(0.5, 0.5), camera_id="cam1", snapshot_interval_seconds=10.0
    )

    handler.update(0, timestamp=0.0, people=[_state(1, True)])
    events = handler.update(1, timestamp=0.5, people=[_state(1, True), _state(2, True)])

    assert len(events) == 1
    assert events[0].metadata["current_count"] == 2


def test_count_does_not_snapshot_before_interval_if_unchanged() -> None:
    handler = CountRuleHandler(
        _zone(), centroid=(0.5, 0.5), camera_id="cam1", snapshot_interval_seconds=5.0
    )

    handler.update(0, timestamp=0.0, people=[_state(1, True)])
    events = handler.update(1, timestamp=1.0, people=[_state(1, True)])

    assert events == []


def test_count_snapshots_after_interval_even_if_unchanged() -> None:
    handler = CountRuleHandler(
        _zone(), centroid=(0.5, 0.5), camera_id="cam1", snapshot_interval_seconds=1.0
    )

    handler.update(0, timestamp=0.0, people=[_state(1, True)])
    events = handler.update(1, timestamp=1.5, people=[_state(1, True)])

    assert len(events) == 1


def test_count_flags_degraded_when_over_nominal_capacity() -> None:
    handler = CountRuleHandler(
        _zone(), centroid=(0.5, 0.5), camera_id="cam1", max_nominal=1
    )

    events = handler.update(0, timestamp=0.0, people=[_state(1, True), _state(2, True)])

    assert events[0].metadata["degraded"] is True
