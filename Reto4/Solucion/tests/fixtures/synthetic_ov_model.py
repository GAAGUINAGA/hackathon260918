"""Construye un modelo OpenVINO sintetico y deterministico para tests.

No usa YOLOv11s real (ni ultralytics/torch): el grafo es un Parameter de
entrada (ignorado numericamente) + un Constant que produce exactamente
el tensor de salida que el test necesita, con la misma forma que un
export real de YOLOv8/v11 ((1, 4+num_clases, N)). Esto permite probar
Detector.infer() end-to-end (Core.compile_model + verificacion de hash)
sin descargar pesos ni depender de torch en el entorno de test.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
import openvino as ov
import openvino.opset14 as ops


def build_and_save(
    xml_path: Path,
    raw_output: np.ndarray,
    input_shape: tuple[int, int, int, int] = (1, 3, 640, 640),
) -> None:
    parameter = ov.opset14.parameter(list(input_shape), ov.Type.f32, name="images")
    constant = ops.constant(raw_output.astype(np.float32))
    result = ops.result(constant)
    model = ov.Model(results=[result], parameters=[parameter], name="synthetic_yolo")
    ov.save_model(model, str(xml_path))


def _sha256_of_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_sha256sums(xml_path: Path, bin_path: Path, sums_path: Path) -> None:
    lines = [
        f"{_sha256_of_file(xml_path)}  {xml_path.name}",
        f"{_sha256_of_file(bin_path)}  {bin_path.name}",
    ]
    sums_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
