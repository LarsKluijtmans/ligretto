"""In-process pub/sub for the real-time invite stream (intent 002, bolt 014).

Fits the single-instance ligretto backend — no Redis/queue. SSE handlers (async, on the event loop)
`subscribe`; request handlers (sync, in the threadpool) `publish`. Publishing is made thread-safe by
scheduling delivery on each subscriber's captured loop. Best-effort: a full/slow queue drops the event,
and the client reconciles the authoritative pending list on (re)connect — correctness never depends on a
delivered event.

If the backend is ever scaled to multiple instances, swap this for a shared bus (e.g. Redis pub/sub).
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass

_QUEUE_MAX = 100


@dataclass(eq=False)
class Subscriber:
    queue: "asyncio.Queue[dict]"
    loop: asyncio.AbstractEventLoop


def _safe_put(queue: "asyncio.Queue[dict]", event: dict) -> None:
    try:
        queue.put_nowait(event)
    except asyncio.QueueFull:
        pass  # slow/absent reader — drop; the client reconciles on reconnect


class EventBus:
    def __init__(self) -> None:
        self._subs: dict[int, set[Subscriber]] = {}

    async def subscribe(self, player_id: int) -> Subscriber:
        sub = Subscriber(queue=asyncio.Queue(maxsize=_QUEUE_MAX), loop=asyncio.get_running_loop())
        self._subs.setdefault(player_id, set()).add(sub)
        return sub

    def unsubscribe(self, player_id: int, sub: Subscriber) -> None:
        subs = self._subs.get(player_id)
        if subs is not None:
            subs.discard(sub)
            if not subs:
                self._subs.pop(player_id, None)

    def publish(self, player_id: int, event: dict) -> None:
        """Deliver `event` to every live connection of `player_id`. Safe to call from a sync request
        handler (threadpool). Never raises."""
        for sub in list(self._subs.get(player_id, ())):
            try:
                sub.loop.call_soon_threadsafe(_safe_put, sub.queue, event)
            except RuntimeError:
                pass  # subscriber's loop is gone


event_bus = EventBus()
