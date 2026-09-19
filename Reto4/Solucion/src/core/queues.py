"""Gestion de colas drop-oldest (P3, planeacion_v1.2.0.md Sec.3.3).

Bajo presion de CPU, la cola nunca bloquea al productor: si esta llena,
se descarta el frame mas antiguo en favor del mas reciente.
"""

from __future__ import annotations

import queue
from typing import TypeVar

T = TypeVar("T")


def enqueue_drop_oldest(q: queue.Queue[T], item: T) -> None:
    try:
        q.put_nowait(item)
        return
    except queue.Full:
        pass
    try:
        q.get_nowait()
    except queue.Empty:
        pass
    try:
        q.put_nowait(item)
    except queue.Full:
        pass
