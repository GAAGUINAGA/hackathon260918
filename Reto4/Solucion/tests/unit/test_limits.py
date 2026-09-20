from __future__ import annotations

from pathlib import Path

import pytest

from src.core.errors import IngestError
from src.security.limits import validate_video_extension, validate_video_size


def test_validate_video_size_accepts_size_within_limit() -> None:
    validate_video_size(size_bytes=10, max_video_size_mb=1)


def test_validate_video_size_rejects_size_over_limit() -> None:
    with pytest.raises(IngestError):
        validate_video_size(size_bytes=2 * 1024 * 1024, max_video_size_mb=1)


def test_validate_video_extension_accepts_allowed_extension() -> None:
    validate_video_extension(Path("clip.MP4"), [".mp4", ".mkv", ".avi"])


def test_validate_video_extension_rejects_disallowed_extension() -> None:
    with pytest.raises(IngestError):
        validate_video_extension(Path("clip.exe"), [".mp4", ".mkv", ".avi"])
