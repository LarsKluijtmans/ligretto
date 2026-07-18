"""SQLAlchemy engine + session + Base + the `get_db` FastAPI dependency.

SQLite (dev/tests) needs `check_same_thread=False` because FastAPI serves requests from a
threadpool. On startup we `create_all` so a fresh SQLite file is usable with zero setup; a
real MySQL deployment should manage schema with migrations, but `create_all` is harmless
there too (it only creates missing tables)."""
from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


def _make_engine(url: str):
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True, future=True)


engine = _make_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    """Create all tables. Called on startup. Import models so they register on Base."""
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
