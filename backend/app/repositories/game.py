"""Game repository — ALL access is host-scoped (default-deny).

Every read that resolves a game takes the caller's `host_player_id` and returns None when
the game isn't theirs. Controllers turn that None into a 404 (never a 403), so a game that
isn't the caller's is indistinguishable from one that doesn't exist.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import Game, GamePlayer, Round


class GameRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # --- reads (host-scoped) -----------------------------------------------------

    def get_for_host(self, game_id: int, host_player_id: int) -> Game | None:
        """Return the game only if it belongs to this host; else None."""
        return self.db.scalar(
            select(Game)
            .where(Game.id == game_id, Game.host_player_id == host_player_id)
            .options(
                selectinload(Game.players).selectinload(GamePlayer.scores),
                selectinload(Game.rounds).selectinload(Round.scores),
            )
        )

    def list_for_host(
        self, host_player_id: int, *, statuses: list[str] | None = None,
        limit: int | None = None, offset: int = 0,
    ) -> list[Game]:
        stmt = (
            select(Game)
            .where(Game.host_player_id == host_player_id)
            .options(
                selectinload(Game.players).selectinload(GamePlayer.scores),
                selectinload(Game.rounds),
            )
            .order_by(Game.created_at.desc(), Game.id.desc())
        )
        if statuses:
            stmt = stmt.where(Game.status.in_(statuses))
        if offset:
            stmt = stmt.offset(offset)
        if limit is not None:
            stmt = stmt.limit(limit)
        return list(self.db.scalars(stmt))

    # --- writes ------------------------------------------------------------------

    def add(self, game: Game) -> Game:
        self.db.add(game)
        self.db.flush()
        return game

    def add_game_player(self, gp: GamePlayer) -> GamePlayer:
        self.db.add(gp)
        self.db.flush()
        return gp

    def delete_game_player(self, gp: GamePlayer) -> None:
        self.db.delete(gp)
        self.db.flush()

    def commit(self) -> None:
        self.db.commit()

    def refresh(self, obj) -> None:
        self.db.refresh(obj)
