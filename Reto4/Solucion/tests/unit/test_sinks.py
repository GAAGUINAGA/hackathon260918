from __future__ import annotations

import csv
import json
import sqlite3
from pathlib import Path

from src.telemetry.events import EventoTelemetria
from src.telemetry.sinks import CSVSink, JSONLSink, SQLiteSink


def _sample_event(**overrides: object) -> EventoTelemetria:
    defaults: dict[str, object] = {
        "frame_idx": 10,
        "camera_id": "cam_test",
        "event_type": "COUNT_SNAPSHOT",
        "anchor_xy": (0.5, 0.5),
        "metadata": {"current_count": 3},
    }
    defaults.update(overrides)
    return EventoTelemetria(**defaults)  # type: ignore[arg-type]


def test_csv_sink_writes_header_once_and_appends_rows(tmp_path: Path) -> None:
    path = tmp_path / "events.csv"

    sink = CSVSink(path)
    sink.emit(_sample_event())
    sink.flush()
    sink.close()

    # reabrir sobre el mismo archivo: el header no debe duplicarse
    sink2 = CSVSink(path)
    sink2.emit(_sample_event(frame_idx=11))
    sink2.flush()
    sink2.close()

    with path.open("r", encoding="utf-8", newline="") as fh:
        content = fh.read()
        rows = list(csv.DictReader(content.splitlines()))

    assert content.count("event_id,timestamp_utc") == 1
    assert len(rows) == 2
    assert rows[0]["camera_id"] == "cam_test"
    assert rows[0]["event_type"] == "COUNT_SNAPSHOT"
    assert rows[1]["frame_idx"] == "11"


def test_jsonl_sink_writes_one_json_object_per_line(tmp_path: Path) -> None:
    path = tmp_path / "events.jsonl"

    sink = JSONLSink(path)
    sink.emit(_sample_event())
    sink.emit(_sample_event(frame_idx=12))
    sink.flush()
    sink.close()

    lines = path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    first = json.loads(lines[0])
    assert first["camera_id"] == "cam_test"
    assert first["frame_idx"] == 10


def test_sqlite_sink_persists_rows_queryable_by_sql(tmp_path: Path) -> None:
    path = tmp_path / "events.sqlite"

    sink = SQLiteSink(path)
    sink.emit(_sample_event())
    sink.flush()
    sink.close()

    conn = sqlite3.connect(path)
    try:
        rows = conn.execute(
            "SELECT camera_id, frame_idx, event_type FROM telemetry_events"
        ).fetchall()
    finally:
        conn.close()

    assert rows == [("cam_test", 10, "COUNT_SNAPSHOT")]
