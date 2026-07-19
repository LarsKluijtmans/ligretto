"""GET /api/v1/events — authenticated Server-Sent Events stream (intent 002, bolt 014).

Pushes the caller's OWN real-time events (today: `invitation.created`) so the web app can show a live
toast + bump the pending-invites badge with no refresh. Auth is the normal Bearer token — the web
client reads this with a fetch-stream (not a token-in-URL EventSource). The stream is a convenience
over the authoritative `GET /invitations`; a dropped connection loses nothing.
"""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from ..deps import current_player
from ..event_bus import event_bus
from ..models import Player

router = APIRouter(prefix="/api/v1", tags=["events"])

_KEEPALIVE_SECONDS = 20


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@router.get("/events")
async def events(
    request: Request,
    me: Player = Depends(current_player),
) -> StreamingResponse:
    player_id = me.id
    sub = await event_bus.subscribe(player_id)

    async def stream():
        # Tell the client it's connected; it reconciles the badge from GET /invitations itself.
        yield _sse({"type": "hello"})
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(sub.queue.get(), timeout=_KEEPALIVE_SECONDS)
                    yield _sse(event)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"  # comment frame keeps proxies from closing the stream
        finally:
            event_bus.unsubscribe(player_id, sub)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
