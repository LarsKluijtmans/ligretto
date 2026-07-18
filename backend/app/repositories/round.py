"""Round repository — rounds and their per-player scores within a game.

Callers must have already resolved the game host-scoped via GameRepository, so these methods
take a game that is known to belong to the caller.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import Round, RoundScore


class RoundRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, game_id: int, number: int) -> Round:
        rnd = Round(game_id=game_id, number=number)
        self.db.add(rnd)
        self.db.flush()
        return rnd

    def get(self, game_id: int, number: int) -> Round | None:
        return self.db.scalar(
            select(Round)
            .where(Round.game_id == game_id, Round.number == number)
            .options(selectinload(Round.scores))
        )

    def add_score(self, score: RoundScore) -> RoundScore:
        self.db.add(score)
        self.db.flush()
        return score

    def clear_scores(self, round_id: int) -> None:
        for s in self.db.scalars(
            select(RoundScore).where(RoundScore.round_id == round_id)
        ):
            self.db.delete(s)
        self.db.flush()
