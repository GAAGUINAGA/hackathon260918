from __future__ import annotations

import csv
from pathlib import Path

import cv2

from src.ai.detector import Detection
from src.core.pipeline import AnalyticsWorker, DetectionPacket
from tests.fixtures.camera_config import build_camera_config
from tests.fixtures.synthetic_video import write_synthetic_video

_SIZE = (64, 64)
_FULL_FRAME_COUNT_ZONE = [
    {
        "name": "lobby",
        "type": "count",
        "polygon": [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]],
    }
]


def test_analytics_worker_emits_events_and_writes_annotated_video(
    tmp_path: Path,
) -> None:
    video_path = tmp_path / "fixture.avi"
    write_synthetic_video(video_path, num_frames=3, size=_SIZE)
    capture = cv2.VideoCapture(str(video_path))

    camera_config = build_camera_config(
        tmp_path / "unused-model",
        resolution_target=_SIZE,
        inference_rate=1,
        zones=_FULL_FRAME_COUNT_ZONE,
    )
    output_dir = tmp_path / "output"
    worker = AnalyticsWorker(capture, camera_config, output_dir, source_fps=10.0)

    detection = Detection(
        bbox_xyxy=(20.0, 20.0, 40.0, 60.0), confidence=0.9, class_id=0
    )
    try:
        worker.process(
            DetectionPacket(frame_idx=0, timestamp=0.0, detections=[detection])
        )
        worker.process(
            DetectionPacket(frame_idx=1, timestamp=0.1, detections=[detection])
        )
    finally:
        worker.close()
        capture.release()

    events_path = output_dir / "events.csv"
    annotated_path = output_dir / "annotated.mp4"
    assert events_path.is_file()
    assert annotated_path.is_file()

    with events_path.open("r", encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    assert any(row["event_type"] == "COUNT_SNAPSHOT" for row in rows)


def test_analytics_worker_skips_packet_when_frame_is_not_readable(
    tmp_path: Path,
) -> None:
    video_path = tmp_path / "fixture.avi"
    write_synthetic_video(video_path, num_frames=1, size=_SIZE)
    capture = cv2.VideoCapture(str(video_path))

    camera_config = build_camera_config(
        tmp_path / "unused-model", resolution_target=_SIZE, inference_rate=1
    )
    output_dir = tmp_path / "output"
    worker = AnalyticsWorker(capture, camera_config, output_dir, source_fps=10.0)

    try:
        # frame_idx fuera de rango: capture.read() falla; no debe lanzar.
        worker.process(DetectionPacket(frame_idx=999, timestamp=0.0, detections=[]))
    finally:
        worker.close()
        capture.release()

    assert (output_dir / "events.csv").is_file()
