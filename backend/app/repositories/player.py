"""Player repository — provisioning + lookup, keyed by the token `sub`."""
from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models import Player


class PlayerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_sub(self, sub: str) -> Player | None:
        return self.db.scalar(select(Player).where(Player.sub == sub))

    def search(self, query: str, limit: int) -> list[Player]:
        """Find players whose display name OR email contains `query` (case-insensitive), capped at
        `limit`. Email is a SEARCH KEY only — the caller (directory service) never puts it in the
        response. LIKE metacharacters in the query are escaped so they match literally."""
        escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        stmt = (
            select(Player)
            .where(
                or_(
                    Player.display_name.ilike(pattern, escape="\\"),
                    Player.email.ilike(pattern, escape="\\"),
                )
            )
            .order_by(Player.display_name.asc(), Player.id.asc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def get(self, player_id: int) -> Player | None:
        return self.db.get(Player, player_id)

    def create(self, *, sub: str, display_name: str, email: str | None) -> Player:
        player = Player(sub=sub, display_name=display_name or sub, email=email)
        self.db.add(player)
        self.db.flush()
        return player

    def save(self) -> None:
        self.db.commit()
