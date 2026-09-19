"""Logger JSON estructurado (CU-05.3, CU-06.3).

Cada registro emite ts/level/component/process/thread/msg (+extra
opcional); la redaccion de PII real llega en Fase 4
(src/security/log_redaction.py).
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "component": record.name,
            "process": record.processName,
            "thread": record.threadName,
            "msg": record.getMessage(),
        }
        extra_fields = getattr(record, "extra_fields", None)
        if extra_fields:
            payload["extra"] = extra_fields
        return json.dumps(payload, ensure_ascii=False)


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger
