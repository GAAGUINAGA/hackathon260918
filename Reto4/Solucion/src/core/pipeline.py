"""Orquestacion de MainProcess y AnalyticsProcess (CU-04.2).

MainProcess corre 2 hilos (Ingesta, Inferencia) y arranca AnalyticsProcess
como proceso aislado (planeacion_v1.2.0.md Sec.3.2):

- Ingesta: lee y redimensiona frames (Fase 1).
- Inferencia: corre `Detector` (Fase 2) sobre cada frame y envia solo las
  detecciones (no pixeles) a `detection_queue`.
- AnalyticsProcess: re-lee el frame por `frame_idx` desde el propio video
  (Sec.3.3/4, sin `shared_memory`), corre `PersonTracker` + `AnalyticsEngine`
  (Fase 3), renderiza el HUD accesible (Fase 4, P2) y despacha los eventos
  a `TelemetryExporter` (Fase 4, CSV/JSONL/SQLite) mientras escribe
  `annotated.mp4` a la tasa de frames original.

Extensores (CU-07.2): un sink o regla nuevos se anaden en
`src/telemetry/sinks.py` / `src/analytics/rules.py`; ninguno de los dos
toca este modulo.
"""

from __future__ import annotations

import multiprocessing
import queue
import threading
from dataclasses import dataclass
from pathlib import Path

import cv2

from src.accessibility.hud_renderer import render_hud
from src.ai.detector import Detection, Detector, build_detector
from src.ai.tracker import ByteTrackConfig, PersonTracker
from src.analytics.process import AnalyticsEngine
from src.core.errors import AnalyticsCrashError, IngestError, PipelineTimeoutError
from src.core.queues import enqueue_drop_oldest
from src.core.reader import FramePacket, read_frames
from src.core.writer import AnnotatedVideoWriter
from src.security.limits import validate_video_extension, validate_video_size
from src.telemetry.events import emit_event
from src.telemetry.exporter import TelemetryExporter
from src.telemetry.sinks import CSVSink, JSONLSink, SQLiteSink
from src.utils.config import CameraConfig, PipelineSettings
from src.utils.logging import get_logger

logger = get_logger("core.pipeline")

_DEFAULT_SOURCE_FPS = 30.0


@dataclass(frozen=True)
class DetectionPacket:
    frame_idx: int
    timestamp: float
    detections: list[Detection]


def _run_ingesta(
    video_path: Path,
    inference_rate: int,
    resolution_target: tuple[int, int],
    allowed_video_extensions: list[str],
    max_video_size_mb: int,
    frame_queue: queue.Queue[FramePacket | None],
) -> None:
    for packet in read_frames(
        video_path,
        inference_rate,
        resolution_target,
        allowed_video_extensions,
        max_video_size_mb,
    ):
        enqueue_drop_oldest(frame_queue, packet)
    enqueue_drop_oldest(frame_queue, None)


def _run_inferencia(
    frame_queue: queue.Queue[FramePacket | None],
    detection_queue: multiprocessing.Queue[DetectionPacket | None],
    detector: Detector,
) -> None:
    while True:
        packet = frame_queue.get()
        if packet is None:
            detection_queue.put(None)
            return
        detections = detector.infer(packet.frame)
        detection_queue.put(
            DetectionPacket(packet.frame_idx, packet.timestamp, detections)
        )


class AnalyticsWorker:
    """Logica por-paquete de AnalyticsProcess: Tracker + Reglas + HUD + Export.

    Extraida de `_run_analytics_process` para poder probarse directamente
    en el proceso principal (coverage.py no instrumenta por defecto el
    codigo que corre dentro de un `multiprocessing.Process`); el
    comportamiento en produccion no cambia, `_run_analytics_process` sigue
    siendo el target real del AnalyticsProcess y solo aporta el bucle de
    la cola + apertura/cierre del video.
    """

    def __init__(
        self,
        capture: cv2.VideoCapture,
        camera_config: CameraConfig,
        output_dir: Path,
        source_fps: float,
    ) -> None:
        self._capture = capture
        self._tracker = PersonTracker(
            ByteTrackConfig(
                track_buffer=camera_config.tracker.track_buffer,
                match_thresh=camera_config.tracker.match_thresh,
                with_reid=camera_config.tracker.with_reid,
            )
        )
        self._engine = AnalyticsEngine(camera_config)
        self._exporter = TelemetryExporter(
            [
                CSVSink(output_dir / "events.csv"),
                JSONLSink(output_dir / "events.jsonl"),
                SQLiteSink(output_dir / "events.sqlite"),
            ]
        )
        self._writer = AnnotatedVideoWriter(
            output_dir / "annotated.mp4",
            fps=source_fps,
            frame_size=camera_config.resolution_target,
        )

    def process(self, packet: DetectionPacket) -> None:
        self._capture.set(cv2.CAP_PROP_POS_FRAMES, packet.frame_idx)
        ok, frame = self._capture.read()
        if not ok:
            return  # frame no releible puntualmente; no aborta la corrida

        tracks = self._tracker.update(
            packet.detections, packet.frame_idx, packet.timestamp
        )
        track_tuples = [(t.track_id, t.bbox_xyxy, t.confidence) for t in tracks]
        events = self._engine.process_frame(
            packet.frame_idx, packet.timestamp, track_tuples
        )
        for event in events:
            emit_event(event, logger)
            self._exporter.emit(event)

        hud_tracks: list[dict[str, object]] = [
            {"track_id": t.track_id, "bbox_xyxy": t.bbox_xyxy} for t in tracks
        ]
        annotated = render_hud(frame, hud_tracks)
        self._writer.write(packet.frame_idx, annotated)

    def close(self) -> None:
        self._exporter.close()
        self._writer.close()


def _run_analytics_process(
    detection_queue: multiprocessing.Queue[DetectionPacket | None],
    video_path: Path,
    camera_config: CameraConfig,
    output_dir: Path,
) -> None:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise IngestError(f"AnalyticsProcess no pudo reabrir el video: {video_path}")
    source_fps = capture.get(cv2.CAP_PROP_FPS) or _DEFAULT_SOURCE_FPS

    worker = AnalyticsWorker(capture, camera_config, output_dir, source_fps)
    try:
        while True:
            packet = detection_queue.get()
            if packet is None:
                return
            worker.process(packet)
    finally:
        worker.close()
        capture.release()


def run_pipeline(
    video_path: Path,
    settings: PipelineSettings,
    camera_config: CameraConfig,
    output_dir: Path,
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

    # Fail-fast tambien para el modelo (P1 CU-06.1): verificar el hash antes
    # de arrancar cualquier hilo/proceso, no al primer frame.
    detector = build_detector(
        Path(camera_config.model.path),
        camera_config.confidence_threshold,
        camera_config.iou_threshold,
        camera_config.model.device,
    )

    frame_queue: queue.Queue[FramePacket | None] = queue.Queue(
        maxsize=settings.frame_queue_maxsize
    )
    detection_queue: multiprocessing.Queue[DetectionPacket | None] = (
        multiprocessing.Queue()
    )

    analytics_process = multiprocessing.Process(
        target=_run_analytics_process,
        args=(detection_queue, video_path, camera_config, output_dir),
        name="AnalyticsProcess",
    )
    inferencia_thread = threading.Thread(
        target=_run_inferencia,
        args=(frame_queue, detection_queue, detector),
        name="Inferencia",
    )
    ingesta_thread = threading.Thread(
        target=_run_ingesta,
        args=(
            video_path,
            camera_config.inference_rate,
            camera_config.resolution_target,
            settings.allowed_video_extensions,
            settings.max_video_size_mb,
            frame_queue,
        ),
        name="Ingesta",
    )

    analytics_process.start()
    inferencia_thread.start()
    ingesta_thread.start()

    # CU-04.2 FE-01: cada etapa se vigila con is_alive() tras su join(timeout);
    # un hilo/proceso que sigue vivo es un timeout tipificado (fail-secure), no
    # un cierre silencioso.
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
    if analytics_process.exitcode != 0:
        raise AnalyticsCrashError(
            f"AnalyticsProcess termino con codigo {analytics_process.exitcode}"
        )
