from __future__ import annotations

from pathlib import Path

import pytest
import yaml as pyyaml
from pydantic import ValidationError

from src.core.errors import ConfigError
from src.security.input_validation import load_camera_config_yaml
from src.utils.config import load_camera_config

VALID_YAML = """
camera_id: "cam_test"
resolution_target: [640, 640]
inference_rate: 5
confidence_threshold: 0.35
iou_threshold: 0.5
model:
  path: "models/test/"
  sha256: "abc123"
  device: "CPU"
tracker:
  algorithm: "bytetrack"
  track_buffer: 60
  match_thresh: 0.8
  with_reid: false
security:
  model_signature_required: true
  allowed_video_extensions: [".mp4"]
  max_video_size_mb: 1024
  yaml_sandbox: true
privacy:
  blur_faces: false
  keep_frames: false
zones:
  - name: "zona1"
    type: "count"
    polygon: [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]]
"""


def _write(tmp_path: Path, content: str) -> Path:
    path = tmp_path / "camera.yaml"
    path.write_text(content, encoding="utf-8")
    return path


def test_load_camera_config_accepts_valid_yaml(tmp_path: Path) -> None:
    config = load_camera_config(_write(tmp_path, VALID_YAML))

    assert config.camera_id == "cam_test"
    assert config.tracker.with_reid is False


def test_load_camera_config_rejects_with_reid_true(tmp_path: Path) -> None:
    bad = VALID_YAML.replace("with_reid: false", "with_reid: true")

    with pytest.raises(ValidationError):
        load_camera_config(_write(tmp_path, bad))


def test_load_camera_config_rejects_unknown_top_level_field(tmp_path: Path) -> None:
    bad = VALID_YAML + "\nunknown_field: 1\n"

    with pytest.raises(ValidationError):
        load_camera_config(_write(tmp_path, bad))


def test_load_camera_config_rejects_out_of_range_polygon_coordinates(
    tmp_path: Path,
) -> None:
    bad = VALID_YAML.replace("[1.0, 1.0]]", "[1.5, 1.0]]")

    with pytest.raises(ValidationError):
        load_camera_config(_write(tmp_path, bad))


def test_load_camera_config_rejects_missing_required_field(tmp_path: Path) -> None:
    bad = VALID_YAML.replace('camera_id: "cam_test"\n', "")

    with pytest.raises(ValidationError):
        load_camera_config(_write(tmp_path, bad))


def test_load_camera_config_rejects_line_with_wrong_point_count(tmp_path: Path) -> None:
    bad = VALID_YAML + """  - name: "linea"
    type: "line_crossing"
    line: [[0.0, 0.0], [0.5, 0.5], [1.0, 1.0]]
"""

    with pytest.raises(ValidationError):
        load_camera_config(_write(tmp_path, bad))


def test_load_camera_config_rejects_malicious_yaml_tag(tmp_path: Path) -> None:
    malicious = "camera_id: !!python/object/apply:os.system ['echo pwned']\n"

    with pytest.raises(pyyaml.YAMLError):
        load_camera_config(_write(tmp_path, malicious))


def test_load_camera_config_rejects_non_mapping_yaml(tmp_path: Path) -> None:
    with pytest.raises(ConfigError):
        load_camera_config(_write(tmp_path, "- just\n- a\n- list\n"))


def test_load_camera_config_yaml_delegates_to_load_camera_config(
    tmp_path: Path,
) -> None:
    # src.security.input_validation.load_camera_config_yaml es un alias
    # delgado (ruta canonica unica, CU-04.1/CU-06.2) -- ver AUDITORIA#4 H2.
    path = _write(tmp_path, VALID_YAML)

    assert load_camera_config_yaml(path) == load_camera_config(path)


def test_load_camera_config_rejects_zero_resolution(tmp_path: Path) -> None:
    bad = VALID_YAML.replace(
        "resolution_target: [640, 640]", "resolution_target: [0, 640]"
    )

    with pytest.raises(ValidationError):
        load_camera_config(_write(tmp_path, bad))


def test_load_camera_config_rejects_self_intersecting_polygon(tmp_path: Path) -> None:
    bad = VALID_YAML.replace(
        "polygon: [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]]",
        "polygon: [[0.0, 0.0], [1.0, 1.0], [1.0, 0.0], [0.0, 1.0]]",
    )

    with pytest.raises(ValidationError):
        load_camera_config(_write(tmp_path, bad))


def test_load_camera_config_rejects_zero_area_polygon(tmp_path: Path) -> None:
    bad = VALID_YAML.replace(
        "polygon: [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]]",
        "polygon: [[0.0, 0.0], [0.5, 0.0], [1.0, 0.0]]",
    )

    with pytest.raises(ValidationError):
        load_camera_config(_write(tmp_path, bad))
