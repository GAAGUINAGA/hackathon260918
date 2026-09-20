from __future__ import annotations

from src.analytics.rules import LineCrossingRuleHandler
from src.analytics.zones import PersonZoneState
from src.utils.config import LineCrossingZoneConfig


def _zone(direction: str = "any") -> LineCrossingZoneConfig:
    return LineCrossingZoneConfig(
        name="puerta",
        type="line_crossing",
        line=[(0.4, 0.5), (0.6, 0.5)],
        direction=direction,  # type: ignore[arg-type]
    )


def _state(track_id: int, anchor: tuple[float, float]) -> PersonZoneState:
    return PersonZoneState(
        track_id=track_id, anchor_xy=anchor, confidence=0.9, in_zones=()
    )


def test_line_crossing_detects_in_direction() -> None:
    handler = LineCrossingRuleHandler(_zone(direction="any"), camera_id="cam1")

    handler.update(0, 0.0, [_state(1, (0.5, 0.4))])
    events = handler.update(1, 1.0, [_state(1, (0.5, 0.6))])

    assert len(events) == 1
    assert events[0].event_type == "LINE_CROSSING"
    assert events[0].metadata["direction"] == "in"


def test_line_crossing_detects_out_direction() -> None:
    handler = LineCrossingRuleHandler(_zone(direction="any"), camera_id="cam1")

    handler.update(0, 0.0, [_state(1, (0.5, 0.6))])
    events = handler.update(1, 1.0, [_state(1, (0.5, 0.4))])

    assert len(events) == 1
    assert events[0].metadata["direction"] == "out"


def test_line_crossing_filters_by_configured_direction() -> None:
    handler = LineCrossingRuleHandler(_zone(direction="out"), camera_id="cam1")

    handler.update(0, 0.0, [_state(1, (0.5, 0.4))])
    events = handler.update(
        1, 1.0, [_state(1, (0.5, 0.6))]
    )  # cruce "in", se pide "out"

    assert events == []


def test_line_crossing_discards_large_jump() -> None:
    handler = LineCrossingRuleHandler(
        _zone(direction="any"), camera_id="cam1", max_jump_distance=0.1
    )

    handler.update(0, 0.0, [_state(1, (0.5, 0.1))])
    events = handler.update(1, 1.0, [_state(1, (0.5, 0.9))])  # salto de 0.8

    assert events == []


def test_line_crossing_no_event_without_prior_position() -> None:
    handler = LineCrossingRuleHandler(_zone(direction="any"), camera_id="cam1")

    events = handler.update(0, 0.0, [_state(1, (0.5, 0.5))])

    assert events == []
