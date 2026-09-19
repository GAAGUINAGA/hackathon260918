from __future__ import annotations

from pathlib import Path

import pytest

from src.security import input_validation, limits, log_redaction, model_integrity


def test_validate_video_size_not_yet_implemented() -> None:
    with pytest.raises(NotImplementedError):
        limits.validate_video_size(size_bytes=1, max_video_size_mb=1)


def test_verify_sha256_not_yet_implemented() -> None:
    with pytest.raises(NotImplementedError):
        model_integrity.verify_sha256(Path("model.xml"), Path("SHA256SUMS"))


def test_load_camera_config_yaml_not_yet_implemented() -> None:
    with pytest.raises(NotImplementedError):
        input_validation.load_camera_config_yaml(Path("camera.yaml"))


def test_redact_not_yet_implemented() -> None:
    with pytest.raises(NotImplementedError):
        log_redaction.redact("mensaje con path C:/Users/alguien")
