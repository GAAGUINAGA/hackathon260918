from __future__ import annotations

from pathlib import Path

import pytest

from src.core.errors import IngestError
from src.core.pipeline import run_pipeline
from src.utils.config import PipelineSettings
from tests.fixtures.synthetic_video import write_synthetic_video


def test_run_pipeline_shuts_down_cleanly_on_eof(tmp_path: Path) -> None:
    video_path = tmp_path / "fixture.avi"
    write_synthetic_video(video_path, num_frames=20, size=(32, 32))
    settings = PipelineSettings(
        inference_rate=2,
        resolution_target=(16, 16),
        max_video_size_mb=1,
        allowed_video_extensions=[".avi"],
        frame_queue_maxsize=3,
    )

    run_pipeline(video_path, settings, join_timeout=15.0)


def test_run_pipeline_rejects_disallowed_extension_before_starting_threads(
    tmp_path: Path,
) -> None:
    video_path = tmp_path / "fixture.exe"
    write_synthetic_video(video_path, num_frames=5, size=(32, 32))
    settings = PipelineSettings(
        inference_rate=1,
        resolution_target=(16, 16),
        max_video_size_mb=1,
        allowed_video_extensions=[".avi"],
        frame_queue_maxsize=3,
    )

    with pytest.raises(IngestError):
        run_pipeline(video_path, settings, join_timeout=5.0)


def test_run_pipeline_rejects_video_over_size_limit_before_starting_threads(
    tmp_path: Path,
) -> None:
    # El chequeo de tamano ocurre antes de abrir el archivo con cv2, asi que
    # no necesita ser un video valido: solo debe superar max_video_size_mb.
    video_path = tmp_path / "fixture.avi"
    video_path.write_bytes(b"0" * (2 * 1024 * 1024))
    settings = PipelineSettings(
        inference_rate=1,
        resolution_target=(16, 16),
        max_video_size_mb=1,
        allowed_video_extensions=[".avi"],
        frame_queue_maxsize=3,
    )

    with pytest.raises(IngestError):
        run_pipeline(video_path, settings, join_timeout=5.0)
