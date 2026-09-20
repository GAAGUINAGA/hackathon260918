# Adaptado de Ultralytics (AGPL-3.0) - ver ./NOTICE.md y ./LICENSE-AGPL-3.0.txt
# Origen: ultralytics/trackers/utils/stracks.py (ultralytics==8.4.156).
# Cambio: se elimina multi_gmc (Global Motion Compensation, no usado).
"""Shared helpers for operating on lists of track objects across trackers."""

from __future__ import annotations

__all__ = (
    "joint_stracks",
    "merge_track_pools",
    "parse_bboxes",
    "remove_duplicate_stracks",
    "sub_stracks",
)

import numpy as np

from . import matching
from .basetrack import TrackState


def merge_track_pools(
    tracker,
    activated: list,
    refind: list,
    lost: list,
    removed: list,
    removed_buffer: int = 1000,
) -> None:
    """Apply the standard end-of-frame bookkeeping to a tracker's persistent pools in place."""
    tracker.tracked_stracks = [
        t for t in tracker.tracked_stracks if t.state == TrackState.Tracked
    ]
    tracker.tracked_stracks = joint_stracks(tracker.tracked_stracks, activated)
    tracker.tracked_stracks = joint_stracks(tracker.tracked_stracks, refind)
    tracker.lost_stracks = sub_stracks(tracker.lost_stracks, tracker.tracked_stracks)
    tracker.lost_stracks.extend(lost)
    tracker.lost_stracks = sub_stracks(tracker.lost_stracks, tracker.removed_stracks)
    tracker.tracked_stracks, tracker.lost_stracks = remove_duplicate_stracks(
        tracker.tracked_stracks, tracker.lost_stracks
    )
    tracker.removed_stracks_frame = removed
    tracker.removed_stracks.extend(removed)
    if len(tracker.removed_stracks) > removed_buffer:
        tracker.removed_stracks = tracker.removed_stracks[-removed_buffer:]


def parse_bboxes(results) -> np.ndarray:
    """Return detection bounding boxes with appended indices from a Results-like object."""
    bboxes = results.xywhr if hasattr(results, "xywhr") else results.xywh
    return np.concatenate([bboxes, np.arange(len(bboxes)).reshape(-1, 1)], axis=-1)


def joint_stracks(atracks: list, btracks: list) -> list:
    """Combine two track lists into one, de-duplicating by `track_id`."""
    a_ids = {t.track_id for t in atracks}
    return atracks + [t for t in btracks if t.track_id not in a_ids]


def sub_stracks(atracks: list, btracks: list) -> list:
    """Filter out tracks from `atracks` whose `track_id` appears in `btracks`."""
    btrack_ids = {t.track_id for t in btracks}
    return [t for t in atracks if t.track_id not in btrack_ids]


def remove_duplicate_stracks(
    atracks: list, btracks: list, dup_thresh: float = 0.15
) -> tuple[list, list]:
    """Remove duplicate tracks across two lists based on Intersection over Union (IoU) distance."""
    pdist = matching.iou_distance(atracks, btracks)
    pairs = np.where(pdist < dup_thresh)
    dupa, dupb = [], []
    for p, q in zip(*pairs):
        timep = atracks[p].frame_id - atracks[p].start_frame
        timeq = btracks[q].frame_id - btracks[q].start_frame
        if timep > timeq:
            dupb.append(q)
        else:
            dupa.append(p)
    dupa_set, dupb_set = set(dupa), set(dupb)
    resa = [t for i, t in enumerate(atracks) if i not in dupa_set]
    resb = [t for i, t in enumerate(btracks) if i not in dupb_set]
    return resa, resb
