from __future__ import annotations

from pathlib import Path

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
