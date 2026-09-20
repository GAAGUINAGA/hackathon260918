from __future__ import annotations

from pathlib import Path

from src.utils.config import CameraConfig


def build_camera_config(
    model_dir: Path,
    camera_id: str = "cam_test",
    resolution_target: tuple[int, int] = (64, 64),
    inference_rate: int = 1,
    zones: list[dict[str, object]] | None = None,
) -> CameraConfig:
    return CameraConfig(
        camera_id=camera_id,
        resolution_target=resolution_target,
        inference_rate=inference_rate,
        confidence_threshold=0.35,
        iou_threshold=0.5,
        model={"path": str(model_dir), "sha256": "unused-in-tests", "device": "CPU"},
        tracker={
            "algorithm": "bytetrack",
            "track_buffer": 60,
            "match_thresh": 0.8,
            "with_reid": False,
        },
        security={
            "model_signature_required": True,
            "allowed_video_extensions": [".avi"],
            "max_video_size_mb": 1024,
            "yaml_sandbox": True,
        },
        privacy={"blur_faces": False, "keep_frames": False},
        zones=zones or [],
    )
