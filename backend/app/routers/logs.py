"""POST /api/logs — forward a client-side event into the project's centralized logging.

The browser cannot write to logs-api directly (that needs an M2M `logs:write` scope, which
must never ship to a browser), so client events come through this authenticated relay. We
stamp the event with the validated caller so the browser can't spoof identity."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ..project_logger import log_event
from ..schemas import LogEventIn, Ok
from ..security import Principal, verify_token

router = APIRouter(prefix="/api", tags=["logs"])


@router.post("/logs", response_model=Ok)
def post_log(event: LogEventIn, principal: Principal = Depends(verify_token)) -> Ok:
    log_event(
        event.level,
        event.message,
        project_id=principal.project_id,
        metadata={**event.metadata, "sub": principal.sub, "source": "frontend"},
    )
    return Ok()
