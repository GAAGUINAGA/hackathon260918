from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from src.core.writer import AnnotatedVideoWriter


def _mean(frame: np.ndarray) -> float:
    return float(frame.mean())


def test_writer_fills_skipped_frames_by_repeating_last_annotated_frame(
    tmp_path: Path,
) -> None:
    path = tmp_path / "annotated.avi"
    writer = AnnotatedVideoWriter(path, fps=10.0, frame_size=(16, 16), fourcc="MJPG")

    frame_a = np.full((16, 16, 3), 40, dtype=np.uint8)
    frame_b = np.full((16, 16, 3), 220, dtype=np.uint8)
    writer.write(0, frame_a)
    writer.write(3, frame_b)  # frames 1 y 2 se rellenan repitiendo frame_a
    writer.close()

    capture = cv2.VideoCapture(str(path))
    frames = []
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            frames.append(frame)
    finally:
        capture.release()

    assert len(frames) == 4
    assert abs(_mean(frames[0]) - 40) < 15
    assert abs(_mean(frames[1]) - 40) < 15
    assert abs(_mean(frames[2]) - 40) < 15
    assert abs(_mean(frames[3]) - 220) < 15


def test_writer_writes_consecutive_frames_without_gaps(tmp_path: Path) -> None:
    path = tmp_path / "annotated.avi"
    writer = AnnotatedVideoWriter(path, fps=10.0, frame_size=(16, 16), fourcc="MJPG")

    for idx in range(5):
        writer.write(idx, np.full((16, 16, 3), idx * 10, dtype=np.uint8))
    writer.close()

    capture = cv2.VideoCapture(str(path))
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    capture.release()

    assert frame_count == 5
