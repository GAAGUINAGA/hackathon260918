"""Integracion end-to-end de Fase 4 (CU-03.x): Detector -> Tracker ->
AnalyticsEngine -> Exporter/Writer, con un modelo OpenVINO sintetico
(ver tests/fixtures/synthetic_person_model.py) para no depender de pesos
YOLOv11s reales. Verifica los criterios de salida de la fase: annotated.mp4
reproducible y events.csv con eventos validos."""

from __future__ import annotations

import csv
from pathlib import Path

import cv2

from src.core.pipeline import run_pipeline
from src.utils.config import PipelineSettings
from tests.fixtures.camera_config import build_camera_config
from tests.fixtures.synthetic_person_model import build_single_person_model
from tests.fixtures.synthetic_video import write_synthetic_video

_SIZE = (64, 64)
_FULL_FRAME_COUNT_ZONE = [
    {
        "name": "lobby",
        "type": "count",
        "polygon": [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]],
    }
]


def test_run_pipeline_produces_annotated_video_and_events_csv(tmp_path: Path) -> None:
    video_path = tmp_path / "fixture.avi"
    write_synthetic_video(video_path, num_frames=5, size=_SIZE)

    model_dir = tmp_path / "model"
    build_single_person_model(model_dir, _SIZE)

    camera_config = build_camera_config(
        model_dir,
        resolution_target=_SIZE,
        inference_rate=1,
        zones=_FULL_FRAME_COUNT_ZONE,
    )
    settings = PipelineSettings(
        inference_rate=1,
        resolution_target=_SIZE,
        max_video_size_mb=1,
        allowed_video_extensions=[".avi"],
        frame_queue_maxsize=5,
    )
    output_dir = tmp_path / "output"

    run_pipeline(video_path, settings, camera_config, output_dir, join_timeout=30.0)

    annotated_path = output_dir / "annotated.mp4"
    events_path = output_dir / "events.csv"
    assert annotated_path.is_file()
    assert events_path.is_file()

    capture = cv2.VideoCapture(str(annotated_path))
    try:
        assert capture.isOpened()
        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    finally:
        capture.release()
    assert frame_count >= 5

    with events_path.open("r", encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))

    assert rows  # al menos un evento
    assert all(row["camera_id"] == camera_config.camera_id for row in rows)
    assert any(row["event_type"] == "COUNT_SNAPSHOT" for row in rows)
