from __future__ import annotations

import pytest

from src.core.errors import IngestError
from src.security.limits import validate_video_size


def test_validate_video_size_accepts_size_within_limit() -> None:
    validate_video_size(size_bytes=10, max_video_size_mb=1)


def test_validate_video_size_rejects_size_over_limit() -> None:
    with pytest.raises(IngestError):
        validate_video_size(size_bytes=2 * 1024 * 1024, max_video_size_mb=1)
