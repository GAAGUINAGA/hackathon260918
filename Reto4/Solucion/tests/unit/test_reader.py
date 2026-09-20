from __future__ import annotations

from pathlib import Path

import pytest

from src.core.errors import IngestError
from src.core.reader import read_frames
from tests.fixtures.synthetic_video import write_synthetic_video

ALLOWED_EXTENSIONS = [".mp4", ".mkv", ".avi"]
MAX_VIDEO_SIZE_MB = 1024


def _read(video_path: Path, inference_rate: int, resolution_target: tuple[int, int]):
    return read_frames(
        video_path,
        inference_rate,
        resolution_target,
        ALLOWED_EXTENSIONS,
        MAX_VIDEO_SIZE_MB,
    )


def test_read_frames_applies_skip_and_preserves_original_frame_idx(
    tmp_path: Path,
) -> None:
    video_path = tmp_path / "fixture.avi"
    write_synthetic_video(video_path, num_frames=10, size=(32, 32))

    packets = list(_read(video_path, inference_rate=3, resolution_target=(16, 16)))

    assert [p.frame_idx for p in packets] == [0, 3, 6, 9]


def test_read_frames_resizes_to_resolution_target(tmp_path: Path) -> None:
    video_path = tmp_path / "fixture.avi"
    write_synthetic_video(video_path, num_frames=1, size=(32, 32))

    packets = list(_read(video_path, inference_rate=1, resolution_target=(16, 16)))

    assert packets[0].frame.shape == (16, 16, 3)


def test_read_frames_reaches_clean_eof(tmp_path: Path) -> None:
    video_path = tmp_path / "fixture.avi"
    write_synthetic_video(video_path, num_frames=5, size=(32, 32))

    packets = list(_read(video_path, inference_rate=1, resolution_target=(16, 16)))

    assert len(packets) == 5


def test_read_frames_raises_ingest_error_when_video_cannot_be_opened(
    tmp_path: Path,
) -> None:
    missing_path = tmp_path / "does-not-exist.avi"

    with pytest.raises(IngestError):
        list(_read(missing_path, inference_rate=1, resolution_target=(16, 16)))


def test_read_frames_rejects_disallowed_extension(tmp_path: Path) -> None:
    video_path = tmp_path / "fixture.exe"
    write_synthetic_video(video_path, num_frames=1, size=(32, 32))

    with pytest.raises(IngestError):
        list(
            read_frames(
                video_path,
                inference_rate=1,
                resolution_target=(16, 16),
                allowed_extensions=ALLOWED_EXTENSIONS,
                max_video_size_mb=MAX_VIDEO_SIZE_MB,
            )
        )


def test_read_frames_rejects_video_over_size_limit(tmp_path: Path) -> None:
    video_path = tmp_path / "fixture.avi"
    write_synthetic_video(video_path, num_frames=5, size=(32, 32))

    with pytest.raises(IngestError):
        list(
            read_frames(
                video_path,
                inference_rate=1,
                resolution_target=(16, 16),
                allowed_extensions=ALLOWED_EXTENSIONS,
                max_video_size_mb=0,
            )
        )
