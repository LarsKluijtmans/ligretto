"""SQLAlchemy engine + session + Base + the `get_db` FastAPI dependency.

SQLite (dev/tests) needs `check_same_thread=False` because FastAPI serves requests from a
threadpool. On startup we `create_all` so a fresh SQLite file is usable with zero setup; a
real MySQL deployment should manage schema with migrations, but `create_all` is harmless
there too (it only creates missing tables)."""
from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, inspect, text
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
    _reconcile_player_columns()


# Columns added to `player` after its first release. `create_all` only ever creates MISSING TABLES —
# it never adds a column to a table that already exists — so the live MySQL `player` table (populated
# the moment anyone logged in) would silently lack these and every read would 1054. Add them
# idempotently on startup, mirroring the platform's create_all-reconcile pattern. On a fresh SQLite
# DB (dev/tests) create_all already made them, so this is a no-op there.
_PLAYER_COLUMN_DDL = {
    "icon_type": {
        "mysql": "ALTER TABLE player ADD COLUMN icon_type VARCHAR(16) NOT NULL DEFAULT 'none'",
        "default": "ALTER TABLE player ADD COLUMN icon_type VARCHAR(16) NOT NULL DEFAULT 'none'",
    },
    "icon_value": {
        "mysql": "ALTER TABLE player ADD COLUMN icon_value VARCHAR(64) NULL",
        "default": "ALTER TABLE player ADD COLUMN icon_value VARCHAR(64) NULL",
    },
    "avatar_data_url": {
        "mysql": "ALTER TABLE player ADD COLUMN avatar_data_url MEDIUMTEXT NULL",
        "default": "ALTER TABLE player ADD COLUMN avatar_data_url TEXT NULL",
    },
}


def _reconcile_player_columns() -> None:
    insp = inspect(engine)
    if "player" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("player")}
    missing = [name for name in _PLAYER_COLUMN_DDL if name not in existing]
    if not missing:
        return
    dialect = engine.dialect.name
    with engine.begin() as conn:
        for name in missing:
            stmt = _PLAYER_COLUMN_DDL[name].get(dialect, _PLAYER_COLUMN_DDL[name]["default"])
            conn.execute(text(stmt))


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
