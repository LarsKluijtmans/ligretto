"""Game repository — ALL access is host-scoped (default-deny).

Every read that resolves a game takes the caller's `host_player_id` and returns None when
the game isn't theirs. Controllers turn that None into a 404 (never a 403), so a game that
isn't the caller's is indistinguishable from one that doesn't exist.
"""
from __future__ import annotations

from sqlalchemy import and_, exists, or_, select
from sqlalchemy.orm import Session, selectinload

from ..models import Game, GamePlayer, Round


def _readable_by(player_id: int):
    """A game is readable by a player if they HOST it or hold an account seat in it (an accepted
    invitee). Used for reads only — mutations stay host-only."""
    seated = exists().where(
        and_(GamePlayer.game_id == Game.id, GamePlayer.player_id == player_id)
    )
    return or_(Game.host_player_id == player_id, seated)


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

    def get(self, game_id: int) -> Game | None:
        """Load a game by id with NO ownership scope — internal use only (the invitation-accept flow,
        where access is authorised by the invitee's own pending invitation). Never expose directly."""
        return self.db.scalar(
            select(Game)
            .where(Game.id == game_id)
            .options(
                selectinload(Game.players).selectinload(GamePlayer.scores),
                selectinload(Game.rounds).selectinload(Round.scores),
            )
        )

    def get_readable(self, game_id: int, player_id: int) -> Game | None:
        """The game only if the player may READ it (host or accepted account seat); else None."""
        return self.db.scalar(
            select(Game)
            .where(Game.id == game_id, _readable_by(player_id))
            .options(
                selectinload(Game.players).selectinload(GamePlayer.scores),
                selectinload(Game.rounds).selectinload(Round.scores),
            )
        )

    def list_for_player(
        self, player_id: int, *, statuses: list[str] | None = None,
        limit: int | None = None, offset: int = 0,
    ) -> list[Game]:
        """Games the player HOSTS or is an accepted account seat in — for their games list + history."""
        stmt = (
            select(Game)
            .where(_readable_by(player_id))
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

    def list_completed_seating(self, player_id: int) -> list[Game]:
        """Completed games where `player_id` holds an account seat — used to compute that player's
        OWN aggregate win rate (shown on their public card). NOT host-scoped: it returns aggregates,
        never game detail exposed to other users. Loads seats + their scores so totals (and ties)
        can be computed. Today a player is only seated in games they host; when invitations land
        (bolt 011) accepted seats are included automatically."""
        stmt = (
            select(Game)
            .join(GamePlayer, GamePlayer.game_id == Game.id)
            .where(Game.status == "completed", GamePlayer.player_id == player_id)
            .options(selectinload(Game.players).selectinload(GamePlayer.scores))
            .order_by(Game.id.desc())
            .distinct()
        )
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
