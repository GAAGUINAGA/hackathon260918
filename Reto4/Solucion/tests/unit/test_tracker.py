from __future__ import annotations

import pytest

from src.ai.detector import Detection
from src.ai.tracker import ByteTrackConfig, PersonTracker
from src.core.errors import TrackerConfigError


def _moving_person_detection(frame_idx: int) -> Detection:
    x1 = 100.0 + frame_idx * 1.0
    y1 = 100.0 + frame_idx * 0.5
    return Detection(
        bbox_xyxy=(x1, y1, x1 + 40.0, y1 + 90.0), confidence=0.9, class_id=0
    )


def test_tracker_assigns_stable_id_across_100_frames() -> None:
    tracker = PersonTracker()

    track_ids_per_frame: list[set[int]] = []
    for frame_idx in range(100):
        detection = _moving_person_detection(frame_idx)
        tracks = tracker.update(
            [detection], frame_idx=frame_idx, timestamp=float(frame_idx)
        )
        track_ids_per_frame.append({t.track_id for t in tracks})

    # Warm-up frames may not yet report an activated track; once one appears it must
    # stay the same id for the rest of the sequence (CU-01.3 Post: id estable).
    seen_ids: set[int] = set()
    for ids in track_ids_per_frame:
        seen_ids |= ids
    assert len(seen_ids) == 1

    activated_frames = [ids for ids in track_ids_per_frame if ids]
    assert len(activated_frames) >= 90


def test_tracker_rejects_with_reid_true() -> None:
    with pytest.raises(TrackerConfigError):
        PersonTracker(ByteTrackConfig(with_reid=True))
