"""Orquestacion de MainProcess y AnalyticsProcess (CU-04.2).

MainProcess corre 2 hilos (Ingesta, Inferencia) y arranca AnalyticsProcess
como proceso aislado (planeacion_v1.2.0.md Sec.3.2). En Fase 1, Inferencia
y AnalyticsProcess son stubs de paso (pass-through / drain) que solo
garantizan el cierre ordenado con centinelas; se reemplazan en Fase 2
(src/ai/detector.py) y Fase 3 (src/analytics/process.py).
"""

from __future__ import annotations

import multiprocessing
import queue
import threading
from pathlib import Path

from src.core.errors import PipelineTimeoutError
from src.core.queues import enqueue_drop_oldest
from src.core.reader import FramePacket, read_frames
from src.utils.config import PipelineSettings
from src.utils.logging import get_logger

logger = get_logger("core.pipeline")


def _run_ingesta(
    video_path: Path,
    settings: PipelineSettings,
    frame_queue: queue.Queue[FramePacket | None],
) -> None:
    for packet in read_frames(
        video_path, settings.inference_rate, settings.resolution_target
    ):
        enqueue_drop_oldest(frame_queue, packet)
    enqueue_drop_oldest(frame_queue, None)


def _run_inferencia(
    frame_queue: queue.Queue[FramePacket | None],
    detection_queue: multiprocessing.Queue[FramePacket | None],
) -> None:
    # TODO Fase 2: reemplazar por inferencia OpenVINO real (src/ai/detector.py).
    while True:
        packet = frame_queue.get()
        if packet is None:
            detection_queue.put(None)
            return
        detection_queue.put(packet)


def _run_analytics_process(
    detection_queue: multiprocessing.Queue[FramePacket | None],
) -> None:
    # TODO Fase 3+: tracking, reglas, render, export (src/analytics/process.py).
    while True:
        packet = detection_queue.get()
        if packet is None:
            return


def run_pipeline(
    video_path: Path,
    settings: PipelineSettings,
    join_timeout: float = 30.0,
) -> None:
    frame_queue: queue.Queue[FramePacket | None] = queue.Queue(
        maxsize=settings.frame_queue_maxsize
    )
    detection_queue: multiprocessing.Queue[FramePacket | None] = multiprocessing.Queue()

    analytics_process = multiprocessing.Process(
        target=_run_analytics_process,
        args=(detection_queue,),
        name="AnalyticsProcess",
    )
    inferencia_thread = threading.Thread(
        target=_run_inferencia,
        args=(frame_queue, detection_queue),
        name="Inferencia",
    )
    ingesta_thread = threading.Thread(
        target=_run_ingesta,
        args=(video_path, settings, frame_queue),
        name="Ingesta",
    )

    analytics_process.start()
    inferencia_thread.start()
    ingesta_thread.start()

    ingesta_thread.join(timeout=join_timeout)
    inferencia_thread.join(timeout=join_timeout)
    analytics_process.join(timeout=join_timeout)

    if analytics_process.is_alive():
        analytics_process.terminate()
        raise PipelineTimeoutError("AnalyticsProcess no cerro dentro del timeout")
