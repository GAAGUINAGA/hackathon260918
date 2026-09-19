from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


def write_synthetic_video(path: Path, num_frames: int, size: tuple[int, int]) -> None:
    fourcc = cv2.VideoWriter_fourcc(*"MJPG")
    writer = cv2.VideoWriter(str(path), fourcc, 10.0, size)
    try:
        for i in range(num_frames):
            frame = np.full((size[1], size[0], 3), fill_value=i % 256, dtype=np.uint8)
            writer.write(frame)
    finally:
        writer.release()
