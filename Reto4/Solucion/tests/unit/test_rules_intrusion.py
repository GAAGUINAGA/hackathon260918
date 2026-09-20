from __future__ import annotations

from src.analytics.rules import IntrusionRuleHandler
from src.analytics.zones import PersonZoneState
from src.utils.config import PolygonZoneConfig

ZONE_NAME = "restringida"


def _zone() -> PolygonZoneConfig:
    return PolygonZoneConfig(
        name=ZONE_NAME, type="intrusion", polygon=[(0.0, 0.0), (1.0, 0.0), (1.0, 1.0)]
    )


def _state(track_id: int, in_zone: bool) -> PersonZoneState:
    return PersonZoneState(
        track_id=track_id,
        anchor_xy=(0.3, 0.3),
        confidence=0.9,
        in_zones=(ZONE_NAME,) if in_zone else (),
    )


def test_intrusion_alerts_once_on_entry_and_not_while_still_inside() -> None:
    handler = IntrusionRuleHandler(_zone(), camera_id="cam1")

    events_0 = handler.update(0, 0.0, [_state(1, True)])
    events_1 = handler.update(1, 1.0, [_state(1, True)])

    assert len(events_0) == 1
    assert events_0[0].event_type == "INTRUSION_ALERT"
    assert events_1 == []


def test_intrusion_alerts_again_after_leaving_and_reentering() -> None:
    handler = IntrusionRuleHandler(_zone(), camera_id="cam1")

    handler.update(0, 0.0, [_state(1, True)])
    handler.update(1, 1.0, [_state(1, False)])
    events = handler.update(2, 2.0, [_state(1, True)])

    assert len(events) == 1
