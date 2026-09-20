from __future__ import annotations

from pathlib import Path

import numpy as np

from tests.fixtures.synthetic_ov_model import build_and_save, write_sha256sums


def build_single_person_model(model_dir: Path, frame_size: tuple[int, int]) -> None:
    """Escribe en `model_dir` un modelo OpenVINO sintetico + SHA256SUMS que
    siempre detecta una unica persona centrada en `frame_size` (ignora el
    contenido real del frame, ver tests/fixtures/synthetic_ov_model.py)."""
    model_dir.mkdir(parents=True, exist_ok=True)
    width, height = frame_size
    predictions = np.zeros((4 + 2, 1), dtype=np.float32)
    predictions[0:4, 0] = [width / 2.0, height / 2.0, width / 4.0, height / 2.0]
    predictions[4:, 0] = [0.9, 0.05]

    xml_path = model_dir / "model.xml"
    bin_path = model_dir / "model.bin"
    build_and_save(
        xml_path, predictions[np.newaxis, :, :], input_shape=(1, 3, height, width)
    )
    write_sha256sums(xml_path, bin_path, model_dir / "SHA256SUMS")
