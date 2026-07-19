"""Game invitations (intent 002) — accept-required.

The host invites an existing Ligretto player → a PENDING invitation (they are NOT seated yet). The
invitee accepts → they are seated as a linked `account` player (player_id set), which is what makes
their scores + stats count; or declines. Consent rule: a player's record only ever changes for games
they host or ACCEPT — being invited (or declining) never seats them or touches their stats.
"""
from __future__ import annotations

from datetime import datetime, timezone

from ..models import GameInvitation, GamePlayer, Player
from ..repositories.game import GameRepository
from ..repositories.invitation import InvitationRepository
from ..repositories.player import PlayerRepository
from ..schemas import InvitationOut, PendingInviteOut
from ..services.player_directory_service import display_name_for, to_player_card
from ..services.stats_service import StatsService
from .errors import BadRequest, Conflict, NotFound

MAX_PLAYERS = 10


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _first_round_scored(game) -> bool:
    return any(rnd.scores for rnd in game.rounds)


class InvitationService:
    def __init__(
        self,
        invitations: InvitationRepository,
        games: GameRepository,
        players: PlayerRepository,
        stats: StatsService,
    ) -> None:
        self.invitations = invitations
        self.games = games
        self.players = players
        self.stats = stats

    # --- host actions ------------------------------------------------------------

    def invite(self, game_id: int, host_player_id: int, invitee_sub: str) -> InvitationOut:
        game = self.games.get_for_host(game_id, host_player_id)
        if game is None:
            raise NotFound("game not found")
        if game.status != "active":
            raise Conflict("cannot invite to a finished game")
        if _first_round_scored(game):
            raise Conflict("cannot invite after round 1 is scored")

        invitee = self.players.get_by_sub(invitee_sub)
        if invitee is None:
            raise NotFound("player not found")
        if invitee.id == host_player_id:
            raise BadRequest("you are already in this game")
        if any(gp.player_id == invitee.id for gp in game.players):
            raise Conflict("player is already in this game")
        if self.invitations.find_active(game_id, invitee.id) is not None:
            raise Conflict("player is already invited to this game")

        pending = self.invitations.count_pending_for_game(game_id)
        if len(game.players) + pending >= MAX_PLAYERS:
            raise BadRequest(f"a game allows at most {MAX_PLAYERS} players")

        inv = GameInvitation(
            game_id=game_id,
            inviter_player_id=host_player_id,
            invitee_player_id=invitee.id,
            status="pending",
        )
        self.invitations.add(inv)
        self.invitations.commit()
        return self._to_out(inv, invitee)

    def list_for_game(self, game_id: int, host_player_id: int) -> list[InvitationOut]:
        if self.games.get_for_host(game_id, host_player_id) is None:
            raise NotFound("game not found")
        out: list[InvitationOut] = []
        for inv in self.invitations.list_for_game(game_id):
            invitee = self.players.get(inv.invitee_player_id)
            if invitee is not None:
                out.append(self._to_out(inv, invitee))
        return out

    def cancel(self, game_id: int, invitation_id: int, host_player_id: int) -> None:
        if self.games.get_for_host(game_id, host_player_id) is None:
            raise NotFound("game not found")
        inv = self.invitations.get(invitation_id)
        if inv is None or inv.game_id != game_id:
            raise NotFound("invitation not found")
        if inv.status != "pending":
            raise Conflict("only a pending invitation can be cancelled")
        inv.status = "cancelled"
        inv.responded_at = _utcnow()
        self.invitations.commit()

    # --- invitee actions ---------------------------------------------------------

    def list_mine(self, invitee_player_id: int) -> list[PendingInviteOut]:
        out: list[PendingInviteOut] = []
        for inv in self.invitations.list_pending_for_invitee(invitee_player_id):
            game = self.games.get(inv.game_id)
            inviter = self.players.get(inv.inviter_player_id)
            if game is None or inviter is None:
                continue
            out.append(
                PendingInviteOut(
                    id=inv.id,
                    game_id=game.id,
                    game_name=game.name,
                    inviter=to_player_card(inviter, self.stats),
                    created_at=inv.created_at,
                )
            )
        return out

    def accept(self, invitation_id: int, invitee_player_id: int) -> None:
        inv = self._own_pending(invitation_id, invitee_player_id)
        game = self.games.get(inv.game_id)
        if game is None or game.status != "active":
            raise Conflict("the game is no longer open")
        if _first_round_scored(game):
            raise Conflict("the game has already started")
        already_seated = any(gp.player_id == invitee_player_id for gp in game.players)
        if not already_seated:
            if len(game.players) >= MAX_PLAYERS:
                raise BadRequest(f"the game is full ({MAX_PLAYERS} players)")
            invitee: Player | None = self.players.get(invitee_player_id)
            if invitee is None:
                raise NotFound("player not found")
            next_seat = max((gp.seat for gp in game.players), default=0) + 1
            self.games.add_game_player(
                GamePlayer(
                    game_id=game.id,
                    seat=next_seat,
                    kind="account",
                    player_id=invitee.id,
                    display_name=display_name_for(invitee),
                )
            )
        inv.status = "accepted"
        inv.responded_at = _utcnow()
        self.invitations.commit()

    def decline(self, invitation_id: int, invitee_player_id: int) -> None:
        inv = self._own_pending(invitation_id, invitee_player_id)
        inv.status = "declined"
        inv.responded_at = _utcnow()
        self.invitations.commit()

    # --- helpers -----------------------------------------------------------------

    def _own_pending(self, invitation_id: int, invitee_player_id: int) -> GameInvitation:
        inv = self.invitations.get(invitation_id)
        if inv is None or inv.invitee_player_id != invitee_player_id:
            raise NotFound("invitation not found")
        if inv.status != "pending":
            raise Conflict("this invitation is no longer pending")
        return inv

    def _to_out(self, inv: GameInvitation, invitee: Player) -> InvitationOut:
        return InvitationOut(
            id=inv.id,
            status=inv.status,
            created_at=inv.created_at,
            invitee=to_player_card(invitee, self.stats),
        )
