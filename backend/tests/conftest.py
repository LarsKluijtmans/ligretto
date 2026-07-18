"""Pytest fixtures: build the app against a temporary SQLite DB and override the identity
dependency with a fake Principal (so tests need no real JWT)."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point the app at a throwaway on-disk SQLite DB *before* importing app modules, and disable
# the platform integrations that would reach out over the network.
os.environ["DATABASE_URL"] = "sqlite:///./_test_ligretto.db"
os.environ["ENABLE_ENRICHMENT"] = "false"
os.environ["ENABLE_PROJECT_LOGGING"] = "false"


@pytest.fixture()
def app_client(tmp_path):
    db_path = tmp_path / "test.db"
    url = f"sqlite:///{db_path.as_posix()}"

    # Rebuild engine/session bound to this test's isolated DB file.
    from app import database

    engine = create_engine(url, connect_args={"check_same_thread": False}, future=True)
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    database.engine = engine
    database.SessionLocal = TestSession
    database.Base.metadata.create_all(bind=engine)

    from app.database import get_db
    from app.main import app
    from app.security import Principal, verify_token

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    def make_principal(sub: str = "user-alice") -> Principal:
        return Principal(
            sub=sub,
            project_id="proj-1",
            company_id="co-1",
            email=f"{sub}@example.com",
            username=sub,
            scope="",
            token_type="access",
        )

    app.state._fake_sub = "user-alice"

    def override_verify_token() -> Principal:
        return make_principal(app.state._fake_sub)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[verify_token] = override_verify_token

    client = TestClient(app)
    client._set_user = lambda sub: setattr(app.state, "_fake_sub", sub)  # type: ignore[attr-defined]
    try:
        yield client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def create_game_payload():
    def _make(target_type="points", target_value=100, players=2, name="Game night"):
        return {
            "name": name,
            "target_type": target_type,
            "target_value": target_value,
            "players": [
                {"kind": "guest", "display_name": f"P{i+1}"} for i in range(players)
            ],
        }

    return _make
