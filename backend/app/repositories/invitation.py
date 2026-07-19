"""Game-invitation repository — CRUD for `game_invitation` rows."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import GameInvitation

# Non-terminal statuses: a player may hold at most one of these per game at a time.
ACTIVE_STATUSES = ("pending", "accepted")


class InvitationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, invitation_id: int) -> GameInvitation | None:
        return self.db.get(GameInvitation, invitation_id)

    def list_for_game(self, game_id: int) -> list[GameInvitation]:
        return list(
            self.db.scalars(
                select(GameInvitation)
                .where(GameInvitation.game_id == game_id)
                .order_by(GameInvitation.created_at.asc(), GameInvitation.id.asc())
            )
        )

    def list_pending_for_invitee(self, invitee_player_id: int) -> list[GameInvitation]:
        return list(
            self.db.scalars(
                select(GameInvitation)
                .where(
                    GameInvitation.invitee_player_id == invitee_player_id,
                    GameInvitation.status == "pending",
                )
                .order_by(GameInvitation.created_at.desc(), GameInvitation.id.desc())
            )
        )

    def find_active(self, game_id: int, invitee_player_id: int) -> GameInvitation | None:
        """An existing pending/accepted invite for this invitee+game (blocks duplicates)."""
        return self.db.scalar(
            select(GameInvitation).where(
                GameInvitation.game_id == game_id,
                GameInvitation.invitee_player_id == invitee_player_id,
                GameInvitation.status.in_(ACTIVE_STATUSES),
            )
        )

    def count_pending_for_game(self, game_id: int) -> int:
        return len(
            self.db.scalars(
                select(GameInvitation.id).where(
                    GameInvitation.game_id == game_id,
                    GameInvitation.status == "pending",
                )
            ).all()
        )

    def add(self, invitation: GameInvitation) -> GameInvitation:
        self.db.add(invitation)
        self.db.flush()
        return invitation

    def commit(self) -> None:
        self.db.commit()
