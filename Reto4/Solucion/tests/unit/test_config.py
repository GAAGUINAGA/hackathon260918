from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from pydantic import ValidationError

from src.core.errors import ConfigError
from src.utils.config import load_pipeline_settings

VALID_YAML = """
inference_rate: 5
resolution_target: [640, 640]
max_video_size_mb: 8192
allowed_video_extensions: [".mp4", ".mkv", ".avi"]
"""


def test_load_pipeline_settings_reads_valid_yaml(tmp_path: Path) -> None:
    config_path = tmp_path / "default.yaml"
    config_path.write_text(VALID_YAML, encoding="utf-8")

    settings = load_pipeline_settings(config_path)

    assert settings.inference_rate == 5
    assert settings.resolution_target == (640, 640)
    assert settings.frame_queue_maxsize == 5


def test_load_pipeline_settings_rejects_unknown_fields(tmp_path: Path) -> None:
    config_path = tmp_path / "default.yaml"
    config_path.write_text(VALID_YAML + "\nunknown_field: 1\n", encoding="utf-8")

    with pytest.raises(ValidationError):
        load_pipeline_settings(config_path)


def test_load_pipeline_settings_rejects_non_mapping_yaml(tmp_path: Path) -> None:
    config_path = tmp_path / "default.yaml"
    config_path.write_text("- just\n- a\n- list\n", encoding="utf-8")

    with pytest.raises(ConfigError):
        load_pipeline_settings(config_path)


def test_load_pipeline_settings_rejects_malicious_yaml_tag(tmp_path: Path) -> None:
    config_path = tmp_path / "default.yaml"
    config_path.write_text(
        "inference_rate: !!python/object/apply:os.system ['echo pwned']\n",
        encoding="utf-8",
    )

    with pytest.raises(yaml.YAMLError):
        load_pipeline_settings(config_path)
