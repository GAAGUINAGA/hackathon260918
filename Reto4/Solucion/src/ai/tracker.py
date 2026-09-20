"""Tracking multi-objeto con ByteTrack, sin ReID (CU-01.3).

`with_reid=True` esta prohibido por P1 (sin ReID -> sin biometria) y se
rechaza en la construccion, sin importar de donde venga el valor (YAML,
llamada directa). El algoritmo en si vive en src/ai/tracking/ (adaptado
de Ultralytics, AGPL-3.0 - ver src/ai/tracking/NOTICE.md).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from src.ai.detector import Detection
from src.ai.tracking.byte_tracker import BYTETracker
from src.core.errors import TrackerConfigError


@dataclass(frozen=True)
class TrackedPerson:
    track_id: int
    bbox_xyxy: tuple[float, float, float, float]
    confidence: float
    frame_idx: int
    timestamp: float


@dataclass
class ByteTrackConfig:
    track_buffer: int = 60
    match_thresh: float = 0.8
    track_high_thresh: float = 0.5
    track_low_thresh: float = 0.1
    new_track_thresh: float = 0.6
    fuse_score: bool = True
    with_reid: bool = False


class _DetectionsView:
    """Adaptador Results-like para BYTETracker.update() (conf/xywh/cls + slicing)."""

    def __init__(self, conf: np.ndarray, xywh: np.ndarray, cls: np.ndarray) -> None:
        self.conf = conf
        self.xywh = xywh
        self.cls = cls

    def __len__(self) -> int:
        return len(self.conf)

    def __getitem__(self, mask: np.ndarray) -> _DetectionsView:
        return _DetectionsView(self.conf[mask], self.xywh[mask], self.cls[mask])


def _xyxy_to_xywh(
    bbox: tuple[float, float, float, float],
) -> tuple[float, float, float, float]:
    x1, y1, x2, y2 = bbox
    w = x2 - x1
    h = y2 - y1
    return (x1 + w / 2, y1 + h / 2, w, h)


def _detections_to_view(detections: list[Detection]) -> _DetectionsView:
    if not detections:
        return _DetectionsView(
            np.empty(0, dtype=np.float32),
            np.empty((0, 4), dtype=np.float32),
            np.empty(0, dtype=np.float32),
        )
    conf = np.array([d.confidence for d in detections], dtype=np.float32)
    cls = np.array([d.class_id for d in detections], dtype=np.float32)
    xywh = np.array([_xyxy_to_xywh(d.bbox_xyxy) for d in detections], dtype=np.float32)
    return _DetectionsView(conf, xywh, cls)


class PersonTracker:
    def __init__(self, config: ByteTrackConfig | None = None) -> None:
        config = config or ByteTrackConfig()
        if config.with_reid:
            raise TrackerConfigError(
                "with_reid=true prohibido (P1): sin ReID -> sin datos biometricos"
            )
        self._tracker = BYTETracker(config)

    def update(
        self, detections: list[Detection], frame_idx: int, timestamp: float
    ) -> list[TrackedPerson]:
        view = _detections_to_view(detections)
        raw_tracks = self._tracker.update(view)
        return [
            TrackedPerson(
                track_id=int(row[4]),
                bbox_xyxy=(float(row[0]), float(row[1]), float(row[2]), float(row[3])),
                confidence=float(row[5]),
                frame_idx=frame_idx,
                timestamp=timestamp,
            )
            for row in raw_tracks
        ]
