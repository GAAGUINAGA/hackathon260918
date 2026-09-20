"""Escritura del video anotado a FPS original (CU-03.3).

`AnalyticsProcess` solo procesa 1 de cada `inference_rate` frames (Fase 1
Sec.3.3); para que `annotated.mp4` sea reproducible a la tasa original
del video fuente, los frames intermedios (descartados por el skip de
Ingesta) se rellenan repitiendo el ultimo frame anotado -- interpolacion
por sostenimiento, sin generar frames sinteticos.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from src.core.errors import RenderError


class AnnotatedVideoWriter:
    def __init__(
        self,
        path: Path,
        fps: float,
        frame_size: tuple[int, int],
        fourcc: str = "mp4v",
    ) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._writer = cv2.VideoWriter(
            str(path),
            cv2.VideoWriter_fourcc(*fourcc),  # type: ignore[attr-defined]
            fps,
            frame_size,
        )
        if not self._writer.isOpened():
            raise RenderError(f"no se pudo abrir el escritor de video: {path}")
        self._next_expected_idx = 0
        self._last_frame: np.ndarray | None = None

    def write(self, frame_idx: int, frame: np.ndarray) -> None:
        """Escribe `frame` en `frame_idx`, rellenando el hueco previo.

        Los indices entre el ultimo frame escrito y `frame_idx` (los que
        el frame skip de Ingesta descarto) se rellenan repitiendo el
        ultimo frame anotado, para sostener la tasa de frames original.
        """
        while self._next_expected_idx < frame_idx and self._last_frame is not None:
            self._writer.write(self._last_frame)
            self._next_expected_idx += 1

        self._writer.write(frame)
        self._last_frame = frame
        self._next_expected_idx = frame_idx + 1

    def close(self) -> None:
        self._writer.release()
