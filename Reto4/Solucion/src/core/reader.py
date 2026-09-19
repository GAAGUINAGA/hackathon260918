"""Hilo Lector: ingesta y preprocesamiento de video (CU-01.1).

Aplica frame skip (1 de cada `inference_rate` frames) y resize antes de
encolar. `frame_idx` conserva la posicion real en el video fuente (no la
posicion tras el skip) para permitir la re-lectura por frame_idx en el
AnalyticsProcess (Fase 3, planeacion_v1.2.0.md Sec.3.3/4).
"""

from __future__ import annotations

import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from src.core.errors import IngestError


@dataclass(frozen=True)
class FramePacket:
    frame_idx: int
    timestamp: float
    frame: np.ndarray


def read_frames(
    video_path: Path,
    inference_rate: int,
    resolution_target: tuple[int, int],
) -> Iterator[FramePacket]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise IngestError(f"no se pudo abrir el video: {video_path}")

    try:
        frame_idx = 0
        while True:
            ok, frame = capture.read()
            if not ok:
                return
            if frame_idx % inference_rate == 0:
                resized = cv2.resize(frame, resolution_target)
                yield FramePacket(
                    frame_idx=frame_idx,
                    timestamp=time.time(),
                    frame=resized,
                )
            frame_idx += 1
    finally:
        capture.release()
