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

from src.core.errors import IngestError, PipelineTimeoutError
from src.core.queues import enqueue_drop_oldest
from src.core.reader import FramePacket, read_frames
from src.security.limits import validate_video_extension, validate_video_size
from src.utils.config import PipelineSettings
from src.utils.logging import get_logger

logger = get_logger("core.pipeline")


def _run_ingesta(
    video_path: Path,
    settings: PipelineSettings,
    frame_queue: queue.Queue[FramePacket | None],
) -> None:
    for packet in read_frames(
        video_path,
        settings.inference_rate,
        settings.resolution_target,
        settings.allowed_video_extensions,
        settings.max_video_size_mb,
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
    # Fail-fast (CU-01.1 Pre, CU-06.2): validar ANTES de arrancar hilos/proceso.
    # read_frames() repite esta validacion (defense in depth, P1 Sec.9.2), pero
    # al ser un generador no se ejecuta hasta el primer next() dentro del hilo
    # Ingesta, donde una excepcion no propagaria limpio al llamador de
    # run_pipeline (ver Hallazgo 2, AUDITORIA#3.md).
    validate_video_extension(video_path, settings.allowed_video_extensions)
    if not video_path.is_file():
        raise IngestError(f"video no encontrado: {video_path}")
    validate_video_size(video_path.stat().st_size, settings.max_video_size_mb)

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

    # CU-04.2 FE-01: cada etapa se vigila con is_alive() tras su join(timeout);
    # un hilo/proceso que sigue vivo es un timeout tipificado (fail-secure), no
    # un cierre silencioso. El monitor continuo de 1s (CU-04.2 flujo 3) se
    # implementa en Fase 3 junto con el AnalyticsProcess real.
    ingesta_thread.join(timeout=join_timeout)
    if ingesta_thread.is_alive():
        raise PipelineTimeoutError("Ingesta no cerro dentro del timeout")

    inferencia_thread.join(timeout=join_timeout)
    if inferencia_thread.is_alive():
        raise PipelineTimeoutError("Inferencia no cerro dentro del timeout")

    analytics_process.join(timeout=join_timeout)
    if analytics_process.is_alive():
        analytics_process.terminate()
        raise PipelineTimeoutError("AnalyticsProcess no cerro dentro del timeout")
