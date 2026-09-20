from __future__ import annotations

from src.analytics.process import AnalyticsEngine
from src.utils.config import CameraConfig

CAMERA_CONFIG = {
    "camera_id": "cam_test",
    "resolution_target": (640, 640),
    "inference_rate": 5,
    "confidence_threshold": 0.35,
    "iou_threshold": 0.5,
    "model": {"path": "models/test/", "sha256": "abc123", "device": "CPU"},
    "tracker": {
        "algorithm": "bytetrack",
        "track_buffer": 60,
        "match_thresh": 0.8,
        "with_reid": False,
    },
    "security": {
        "model_signature_required": True,
        "allowed_video_extensions": [".mp4"],
        "max_video_size_mb": 1024,
        "yaml_sandbox": True,
    },
    "privacy": {"blur_faces": False, "keep_frames": False},
    "zones": [
        {
            "name": "lobby",
            "type": "count",
            "polygon": [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]],
        },
        {
            "name": "restringida",
            "type": "intrusion",
            "polygon": [[0.0, 0.0], [0.3, 0.0], [0.3, 0.3]],
        },
    ],
}


def test_analytics_engine_emits_count_and_intrusion_events() -> None:
    engine = AnalyticsEngine(CameraConfig(**CAMERA_CONFIG))

    # Persona en (0.1, 0.05) normalizado -> dentro de lobby y de restringida
    # (estrictamente bajo la hipotenusa y=x del triangulo, no sobre el borde).
    tracks = [(1, (64.0, 0.0, 64.0, 32.0), 0.9)]

    events = engine.process_frame(frame_idx=0, timestamp=0.0, tracks=tracks)

    event_types = {e.event_type for e in events}
    assert "COUNT_SNAPSHOT" in event_types
    assert "INTRUSION_ALERT" in event_types


def test_analytics_engine_excludes_people_from_exclusion_zones() -> None:
    config_dict = dict(CAMERA_CONFIG)
    config_dict["zones"] = [
        {
            "name": "exclusion_ventana",
            "type": "exclusion",
            "polygon": [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]],
        },
        {
            "name": "lobby",
            "type": "count",
            "polygon": [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]],
        },
    ]
    engine = AnalyticsEngine(CameraConfig(**config_dict))

    tracks = [(1, (64.0, 20.0, 64.0, 64.0), 0.9)]
    events = engine.process_frame(frame_idx=0, timestamp=0.0, tracks=tracks)

    count_events = [e for e in events if e.event_type == "COUNT_SNAPSHOT"]
    assert count_events[0].metadata["current_count"] == 0
