from __future__ import annotations

from pathlib import Path

import numpy as np

from src.ai.detector import Detector
from src.ai.tracker import PersonTracker
from tests.fixtures.synthetic_ov_model import build_and_save, write_sha256sums


def _raw_yolo_output_single_person() -> np.ndarray:
    predictions = np.zeros((4 + 2, 1), dtype=np.float32)
    predictions[0:4, 0] = [320.0, 320.0, 40.0, 90.0]
    predictions[4:, 0] = [0.9, 0.05]
    return predictions[np.newaxis, :, :]


def test_detection_to_tracking_end_to_end(tmp_path: Path) -> None:
    xml_path = tmp_path / "model.xml"
    bin_path = tmp_path / "model.bin"
    build_and_save(xml_path, _raw_yolo_output_single_person())
    sums_path = tmp_path / "SHA256SUMS"
    write_sha256sums(xml_path, bin_path, sums_path)

    detector = Detector(xml_path, sums_path)
    tracker = PersonTracker()
    frame = np.zeros((640, 640, 3), dtype=np.uint8)

    track_ids: set[int] = set()
    for frame_idx in range(10):
        detections = detector.infer(frame)
        tracks = tracker.update(
            detections, frame_idx=frame_idx, timestamp=float(frame_idx)
        )
        track_ids |= {t.track_id for t in tracks}

    assert len(track_ids) == 1
