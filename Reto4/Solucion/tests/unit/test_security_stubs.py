from __future__ import annotations

from pathlib import Path

import pytest

from src.security import input_validation, log_redaction


def test_load_camera_config_yaml_not_yet_implemented() -> None:
    with pytest.raises(NotImplementedError):
        input_validation.load_camera_config_yaml(Path("camera.yaml"))


def test_redact_not_yet_implemented() -> None:
    with pytest.raises(NotImplementedError):
        log_redaction.redact("mensaje con path C:/Users/alguien")
