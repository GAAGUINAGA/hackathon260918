from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from src.ai.detector import PERSON_CLASS_ID, Detector, postprocess
from src.core.errors import ModelIntegrityError
from tests.fixtures.synthetic_ov_model import build_and_save, write_sha256sums


def _raw_yolo_output(
    boxes_cxcywh: list[tuple[float, float, float, float]],
    scores_per_class: list[list[float]],
) -> np.ndarray:
    num_classes = len(scores_per_class[0])
    num_boxes = len(boxes_cxcywh)
    predictions = np.zeros((4 + num_classes, num_boxes), dtype=np.float32)
    for i, (cx, cy, w, h) in enumerate(boxes_cxcywh):
        predictions[0:4, i] = [cx, cy, w, h]
        predictions[4:, i] = scores_per_class[i]
    return predictions[np.newaxis, :, :]


def test_postprocess_keeps_high_confidence_person_and_drops_the_rest() -> None:
    raw_output = _raw_yolo_output(
        boxes_cxcywh=[
            (50.0, 50.0, 20.0, 20.0),  # person, high conf
            (52.0, 52.0, 20.0, 20.0),  # person, high conf, overlaps box 0 -> NMS
            (10.0, 10.0, 5.0, 5.0),  # person, low conf -> filtered by threshold
            (80.0, 80.0, 15.0, 15.0),  # non-person (class 1), high conf -> filtered
        ],
        scores_per_class=[
            [0.9, 0.1],
            [0.85, 0.1],
            [0.2, 0.1],
            [0.1, 0.95],
        ],
    )

    detections = postprocess(raw_output, confidence_threshold=0.35, iou_threshold=0.5)

    assert len(detections) == 1
    assert detections[0].class_id == PERSON_CLASS_ID
    assert detections[0].confidence == pytest.approx(0.9)


def test_postprocess_returns_empty_list_when_nothing_matches() -> None:
    raw_output = _raw_yolo_output(
        boxes_cxcywh=[(10.0, 10.0, 5.0, 5.0)],
        scores_per_class=[[0.1, 0.05]],
    )

    detections = postprocess(raw_output, confidence_threshold=0.35, iou_threshold=0.5)

    assert detections == []


def _build_synthetic_model(tmp_path: Path, raw_output: np.ndarray) -> tuple[Path, Path]:
    xml_path = tmp_path / "model.xml"
    bin_path = tmp_path / "model.bin"
    build_and_save(xml_path, raw_output)
    sums_path = tmp_path / "SHA256SUMS"
    write_sha256sums(xml_path, bin_path, sums_path)
    return xml_path, sums_path


def test_detector_infer_end_to_end_on_synthetic_model(tmp_path: Path) -> None:
    raw_output = _raw_yolo_output(
        boxes_cxcywh=[(320.0, 320.0, 40.0, 80.0)],
        scores_per_class=[[0.9, 0.05]],
    )
    xml_path, sums_path = _build_synthetic_model(tmp_path, raw_output)

    detector = Detector(
        xml_path, sums_path, confidence_threshold=0.35, iou_threshold=0.5
    )
    frame = np.zeros((640, 640, 3), dtype=np.uint8)

    detections = detector.infer(frame)

    assert len(detections) == 1
    assert detections[0].class_id == PERSON_CLASS_ID


def test_detector_aborts_when_bin_is_tampered(tmp_path: Path) -> None:
    raw_output = _raw_yolo_output(
        boxes_cxcywh=[(320.0, 320.0, 40.0, 80.0)],
        scores_per_class=[[0.9, 0.05]],
    )
    xml_path, sums_path = _build_synthetic_model(tmp_path, raw_output)
    bin_path = xml_path.with_suffix(".bin")
    bin_path.write_bytes(bin_path.read_bytes() + b"\x00")

    with pytest.raises(ModelIntegrityError):
        Detector(xml_path, sums_path)
