from __future__ import annotations

from src.analytics.rules import DwellRuleHandler
from src.analytics.zones import PersonZoneState
from src.utils.config import DwellZoneConfig

ZONE_NAME = "cafeteria"


def _zone(
    min_time_seconds: float = 2.0, dwell_rearm_seconds: float = 30.0
) -> DwellZoneConfig:
    return DwellZoneConfig(
        name=ZONE_NAME,
        type="dwell",
        polygon=[(0.0, 0.0), (1.0, 0.0), (1.0, 1.0)],
        min_time_seconds=min_time_seconds,
        dwell_rearm_seconds=dwell_rearm_seconds,
    )


def _state(track_id: int, in_zone: bool) -> PersonZoneState:
    return PersonZoneState(
        track_id=track_id,
        anchor_xy=(0.5, 0.5),
        confidence=0.9,
        in_zones=(ZONE_NAME,) if in_zone else (),
    )


def test_dwell_emits_threshold_once_min_time_elapsed() -> None:
    handler = DwellRuleHandler(_zone(min_time_seconds=2.0), camera_id="cam1")

    events_0 = handler.update(0, timestamp=0.0, people=[_state(1, True)])
    events_1 = handler.update(1, timestamp=1.0, people=[_state(1, True)])
    events_2 = handler.update(2, timestamp=2.0, people=[_state(1, True)])

    assert events_0 == []
    assert events_1 == []
    assert len(events_2) == 1
    assert events_2[0].event_type == "DWELL_TRIGGER"
    assert events_2[0].metadata["phase"] == "threshold"


def test_dwell_quick_transit_is_purged_without_event() -> None:
    handler = DwellRuleHandler(_zone(min_time_seconds=5.0), camera_id="cam1")

    handler.update(0, timestamp=0.0, people=[_state(1, True)])
    events = handler.update(1, timestamp=1.0, people=[_state(1, False)])

    assert events == []


def test_dwell_emits_exit_after_threshold_with_duration() -> None:
    handler = DwellRuleHandler(_zone(min_time_seconds=1.0), camera_id="cam1")

    handler.update(0, timestamp=0.0, people=[_state(1, True)])
    handler.update(1, timestamp=1.0, people=[_state(1, True)])  # threshold
    events = handler.update(2, timestamp=3.0, people=[_state(1, False)])

    assert len(events) == 1
    assert events[0].metadata["phase"] == "exit"
    assert events[0].dwell_seconds == 3.0


def test_dwell_reentry_within_rearm_window_is_ignored() -> None:
    handler = DwellRuleHandler(
        _zone(min_time_seconds=1.0, dwell_rearm_seconds=10.0), camera_id="cam1"
    )

    handler.update(0, timestamp=0.0, people=[_state(1, True)])
    handler.update(1, timestamp=1.0, people=[_state(1, True)])  # threshold
    handler.update(2, timestamp=2.0, people=[_state(1, False)])  # exit

    events = handler.update(
        3, timestamp=5.0, people=[_state(1, True)]
    )  # reingreso a 3s (<10s)

    assert events == []


def test_dwell_reentry_after_rearm_window_starts_new_cycle() -> None:
    handler = DwellRuleHandler(
        _zone(min_time_seconds=1.0, dwell_rearm_seconds=2.0), camera_id="cam1"
    )

    handler.update(0, timestamp=0.0, people=[_state(1, True)])
    handler.update(1, timestamp=1.0, people=[_state(1, True)])  # threshold
    handler.update(2, timestamp=2.0, people=[_state(1, False)])  # exit

    handler.update(3, timestamp=7.0, people=[_state(1, True)])  # reingreso a 5s (>2s)
    events = handler.update(4, timestamp=8.0, people=[_state(1, True)])

    assert len(events) == 1
    assert events[0].metadata["phase"] == "threshold"


def test_dwell_closes_by_timeout_when_track_disappears_beyond_buffer() -> None:
    handler = DwellRuleHandler(
        _zone(min_time_seconds=1.0), camera_id="cam1", track_buffer_frames=2
    )

    handler.update(0, timestamp=0.0, people=[_state(1, True)])
    handler.update(1, timestamp=1.0, people=[_state(1, True)])  # threshold
    handler.update(2, timestamp=2.0, people=[])
    handler.update(3, timestamp=3.0, people=[])
    events = handler.update(4, timestamp=4.0, people=[])  # +3 frames ausente -> timeout

    assert len(events) == 1
    assert events[0].metadata["phase"] == "exit"
