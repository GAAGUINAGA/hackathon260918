"""Sinks de telemetria: CSV, JSONL, SQLite (CU-03.1, planeacion_v1.2.0.md
Sec.8.1).

Todos implementan el protocolo `TelemetrySink` (`emit`/`flush`).
Intercambiables sin tocar el motor (P4 Sec.8.4): anadir un sink nuevo
(p.ej. `SupabaseSink` en Fase 5) no requiere cambios en `analytics/`.
Columnas identicas al contrato CSV de planeacion_v1.2.0.md Sec.6
(`docs/schema/events.md` documenta cada una, Fase 6).
"""

from __future__ import annotations

import csv
import json
import sqlite3
from pathlib import Path
from typing import Protocol

from src.telemetry.events import EventoTelemetria

CSV_HEADERS = [
    "event_id",
    "timestamp_utc",
    "frame_idx",
    "camera_id",
    "event_type",
    "track_id",
    "zone_name",
    "dwell_seconds",
    "confidence",
    "anchor_x",
    "anchor_y",
    "metadata",
]


class TelemetrySink(Protocol):
    def emit(self, event: EventoTelemetria) -> None: ...
    def flush(self) -> None: ...


def _row_dict(event: EventoTelemetria) -> dict[str, object]:
    anchor_x, anchor_y = event.anchor_xy
    return {
        "event_id": str(event.event_id),
        "timestamp_utc": event.timestamp_utc.isoformat(),
        "frame_idx": event.frame_idx,
        "camera_id": event.camera_id,
        "event_type": event.event_type,
        "track_id": event.track_id,
        "zone_name": event.zone_name,
        "dwell_seconds": event.dwell_seconds,
        "confidence": event.confidence,
        "anchor_x": anchor_x,
        "anchor_y": anchor_y,
        "metadata": json.dumps(event.metadata, ensure_ascii=False),
    }


class CSVSink:
    """Escribe eventos en un CSV UTF-8 sin BOM (WCAG 10.2: headers claros).

    Abre en modo append; escribe la fila de headers solo si el archivo
    no existia (permite reanudar una ejecucion sin duplicar headers).
    """

    def __init__(self, path: Path) -> None:
        self._path = path
        is_new = not path.exists()
        path.parent.mkdir(parents=True, exist_ok=True)
        self._file = path.open("a", encoding="utf-8", newline="")
        self._writer = csv.DictWriter(self._file, fieldnames=CSV_HEADERS)
        if is_new:
            self._writer.writeheader()

    def emit(self, event: EventoTelemetria) -> None:
        self._writer.writerow(_row_dict(event))

    def flush(self) -> None:
        self._file.flush()

    def close(self) -> None:
        self._file.close()


class JSONLSink:
    """Escribe un objeto JSON por linea (UTF-8 sin BOM)."""

    def __init__(self, path: Path) -> None:
        self._path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        self._file = path.open("a", encoding="utf-8")

    def emit(self, event: EventoTelemetria) -> None:
        payload = json.loads(event.model_dump_json())
        self._file.write(json.dumps(payload, ensure_ascii=False) + "\n")

    def flush(self) -> None:
        self._file.flush()

    def close(self) -> None:
        self._file.close()


_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS telemetry_events (
    event_id TEXT PRIMARY KEY,
    timestamp_utc TEXT NOT NULL,
    frame_idx INTEGER NOT NULL,
    camera_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    track_id INTEGER,
    zone_name TEXT,
    dwell_seconds REAL,
    confidence REAL,
    anchor_x REAL NOT NULL,
    anchor_y REAL NOT NULL,
    metadata TEXT NOT NULL
)
"""

_INSERT_SQL = """
INSERT INTO telemetry_events (
    event_id, timestamp_utc, frame_idx, camera_id, event_type, track_id,
    zone_name, dwell_seconds, confidence, anchor_x, anchor_y, metadata
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""


class SQLiteSink:
    """Escribe eventos en una tabla `telemetry_events` local (P4 Sec.8.4).

    Mismas columnas que el CSV; permite consultas locales sin depender de
    un sink remoto. Usa siempre parametros posicionales (`?`) -- nunca
    interpolacion de strings -- para evitar inyeccion SQL (P1).
    """

    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path)
        self._conn.execute(_CREATE_TABLE_SQL)
        self._conn.commit()

    def emit(self, event: EventoTelemetria) -> None:
        row = _row_dict(event)
        self._conn.execute(
            _INSERT_SQL,
            (
                row["event_id"],
                row["timestamp_utc"],
                row["frame_idx"],
                row["camera_id"],
                row["event_type"],
                row["track_id"],
                row["zone_name"],
                row["dwell_seconds"],
                row["confidence"],
                row["anchor_x"],
                row["anchor_y"],
                row["metadata"],
            ),
        )

    def flush(self) -> None:
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()
