"""Player repository — provisioning + lookup, keyed by the token `sub`."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Player


class PlayerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_sub(self, sub: str) -> Player | None:
        return self.db.scalar(select(Player).where(Player.sub == sub))

    def get(self, player_id: int) -> Player | None:
        return self.db.get(Player, player_id)

    def create(self, *, sub: str, display_name: str, email: str | None) -> Player:
        player = Player(sub=sub, display_name=display_name or sub, email=email)
        self.db.add(player)
        self.db.flush()
        return player

    def save(self) -> None:
        self.db.commit()
