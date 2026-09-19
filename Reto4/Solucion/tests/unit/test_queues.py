from __future__ import annotations

import queue
import threading

from src.core.queues import enqueue_drop_oldest


def test_enqueue_drop_oldest_drops_the_oldest_item_when_full() -> None:
    q: queue.Queue[int] = queue.Queue(maxsize=2)
    enqueue_drop_oldest(q, 1)
    enqueue_drop_oldest(q, 2)
    enqueue_drop_oldest(q, 3)

    remaining = [q.get_nowait(), q.get_nowait()]

    assert remaining == [2, 3]
    assert q.empty()


def test_enqueue_drop_oldest_keeps_items_when_not_full() -> None:
    q: queue.Queue[int] = queue.Queue(maxsize=5)
    for i in range(3):
        enqueue_drop_oldest(q, i)

    assert list(q.queue) == [0, 1, 2]


def test_enqueue_drop_oldest_handles_10000_concurrent_puts_without_crashing() -> None:
    q: queue.Queue[int] = queue.Queue(maxsize=5)
    iterations = 10_000
    threads_count = 8
    per_thread = iterations // threads_count

    def worker(start: int, count: int) -> None:
        for i in range(count):
            enqueue_drop_oldest(q, start + i)

    threads = [
        threading.Thread(target=worker, args=(t * per_thread, per_thread))
        for t in range(threads_count)
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=10)
        assert not t.is_alive()

    assert q.qsize() <= 5
