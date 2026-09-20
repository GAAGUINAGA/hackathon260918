"""Wrapper OpenVINO para deteccion de personas (CU-01.2).

El modelo solo se carga tras verificar su hash SHA256 (fail-secure, P1,
CU-06.1). El grafo produce un tensor crudo (1, 4+num_clases, N) estilo
YOLOv8/v11 (cx,cy,w,h + puntajes por clase, sin objectness separado);
este modulo hace el postprocesado (filtro de clase `person`, umbral de
confianza, NMS) en Python/NumPy, fuera del grafo.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import openvino as ov

from src.core.errors import ModelIntegrityError
from src.security.model_integrity import verify_sha256

PERSON_CLASS_ID = 0


@dataclass(frozen=True)
class Detection:
    bbox_xyxy: tuple[float, float, float, float]
    confidence: float
    class_id: int


def _bin_path_for(xml_path: Path) -> Path:
    return xml_path.with_suffix(".bin")


def preprocess(frame: np.ndarray) -> np.ndarray:
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    chw = rgb.transpose(2, 0, 1)
    normalized = chw.astype(np.float32) / 255.0
    return np.expand_dims(normalized, axis=0)


def postprocess(
    raw_output: np.ndarray,
    confidence_threshold: float,
    iou_threshold: float,
) -> list[Detection]:
    predictions = raw_output[0].transpose(1, 0)  # (N, 4+num_classes)
    boxes_cxcywh = predictions[:, :4]
    class_scores = predictions[:, 4:]

    class_ids = np.argmax(class_scores, axis=1)
    confidences = np.max(class_scores, axis=1)

    person_mask = (class_ids == PERSON_CLASS_ID) & (confidences >= confidence_threshold)
    if not np.any(person_mask):
        return []

    boxes_cxcywh = boxes_cxcywh[person_mask]
    confidences = confidences[person_mask]

    cx, cy, w, h = boxes_cxcywh.T
    x1 = cx - w / 2
    y1 = cy - h / 2
    boxes_xywh = np.stack([x1, y1, w, h], axis=1)

    kept_indices = cv2.dnn.NMSBoxes(
        boxes_xywh.tolist(),
        confidences.tolist(),
        score_threshold=confidence_threshold,
        nms_threshold=iou_threshold,
    )

    detections = []
    for i in np.array(kept_indices).flatten():
        x, y, box_w, box_h = boxes_xywh[i]
        detections.append(
            Detection(
                bbox_xyxy=(float(x), float(y), float(x + box_w), float(y + box_h)),
                confidence=float(confidences[i]),
                class_id=PERSON_CLASS_ID,
            )
        )
    return detections


class Detector:
    def __init__(
        self,
        model_xml_path: Path,
        sha256sums_path: Path,
        confidence_threshold: float = 0.35,
        iou_threshold: float = 0.5,
        device: str = "CPU",
    ) -> None:
        verify_sha256(model_xml_path, sha256sums_path)
        verify_sha256(_bin_path_for(model_xml_path), sha256sums_path)

        core = ov.Core()
        model = core.read_model(model_xml_path)
        self._compiled_model = core.compile_model(model, device)
        self._output_port = self._compiled_model.output(0)
        self._confidence_threshold = confidence_threshold
        self._iou_threshold = iou_threshold

    def infer(self, frame: np.ndarray) -> list[Detection]:
        input_tensor = preprocess(frame)
        result = self._compiled_model([input_tensor])
        raw_output = result[self._output_port]
        return postprocess(raw_output, self._confidence_threshold, self._iou_threshold)


def _find_model_xml(model_dir: Path) -> Path:
    xml_files = sorted(model_dir.glob("*.xml"))
    if len(xml_files) != 1:
        raise ModelIntegrityError(
            f"{model_dir}: se esperaba exactamente 1 archivo .xml, "
            f"se encontraron {len(xml_files)}"
        )
    return xml_files[0]


def build_detector(
    model_dir: Path,
    confidence_threshold: float = 0.35,
    iou_threshold: float = 0.5,
    device: str = "CPU",
) -> Detector:
    """Construye un `Detector` a partir de un directorio exportado
    (`CameraConfig.model.path`, ver `src/ai/export_openvino.py`)."""
    xml_path = _find_model_xml(model_dir)
    sums_path = model_dir / "SHA256SUMS"
    return Detector(xml_path, sums_path, confidence_threshold, iou_threshold, device)
