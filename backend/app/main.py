"""FastAPI entrypoint for the Ligretto scorekeeper backend.

Run it from `backend/`:
    uvicorn app.main:app --host 127.0.0.1 --port 9000 --reload
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import games, history, logs, me, players


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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
