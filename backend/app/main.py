"""FastAPI entrypoint for the Ligretto scorekeeper backend.

Run it from `backend/`:
    uvicorn app.main:app --host 127.0.0.1 --port 9000 --reload
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import init_db
from .project_logger import log_event
from .routers import events, games, history, insights, invitations, logs, me, players


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (SQLite dev + first-run convenience; harmless on MySQL).
    init_db()
    yield


app = FastAPI(title=f"{settings.app_name} backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,  # we use Bearer tokens, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(games.router)
app.include_router(history.router)
app.include_router(logs.router)
app.include_router(players.router)
app.include_router(invitations.router)
app.include_router(events.router)
app.include_router(insights.router)


@app.exception_handler(Exception)
async def _log_unhandled(request: Request, exc: Exception) -> JSONResponse:
    """Last-resort handler: ship every UNHANDLED 500 to logs-api as an error (best-effort), then
    return a generic body. Expected 4xx (ServiceError -> HTTPException) are handled in the routers
    and never reach here, so this stays quiet except on real bugs."""
    log_event(
        "error",
        f"Unhandled error: {type(exc).__name__}: {exc}",
        metadata={
            "component": "api",
            "operation": f"{request.method} {request.url.path}",
            "error_type": type(exc).__name__,
        },
    )
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
