"""Game-invitation endpoints (intent 002, bolt 011).

Host: invite a searched player, list a game's invitations, cancel a pending one.
Invitee: list my pending invites, accept (→ seated as a linked account player), decline.
Consent: a player joins + their stats count ONLY after they accept.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..deps import current_player, invitation_service
from ..models import Player
from ..schemas import InvitationOut, InviteCreateIn, Ok, PendingInviteOut
from ..services.errors import ServiceError
from ..services.invitation_service import InvitationService

router = APIRouter(prefix="/api/v1", tags=["invitations"])


def _handle(exc: ServiceError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


# --- host (scoped to their game) -------------------------------------------------

@router.post("/games/{game_id}/invitations", response_model=InvitationOut, status_code=201)
def invite_player(
    game_id: int,
    body: InviteCreateIn,
    me: Player = Depends(current_player),
    invitations: InvitationService = Depends(invitation_service),
) -> InvitationOut:
    try:
        return invitations.invite(game_id, me.id, body.invitee_id)
    except ServiceError as exc:
        raise _handle(exc)


@router.get("/games/{game_id}/invitations", response_model=list[InvitationOut])
def list_game_invitations(
    game_id: int,
    me: Player = Depends(current_player),
    invitations: InvitationService = Depends(invitation_service),
) -> list[InvitationOut]:
    try:
        return invitations.list_for_game(game_id, me.id)
    except ServiceError as exc:
        raise _handle(exc)


@router.delete("/games/{game_id}/invitations/{invitation_id}", response_model=Ok)
def cancel_invitation(
    game_id: int,
    invitation_id: int,
    me: Player = Depends(current_player),
    invitations: InvitationService = Depends(invitation_service),
) -> Ok:
    try:
        invitations.cancel(game_id, invitation_id, me.id)
    except ServiceError as exc:
        raise _handle(exc)
    return Ok()


# --- invitee (scoped to themselves) ----------------------------------------------

@router.get("/invitations", response_model=list[PendingInviteOut])
def my_invitations(
    me: Player = Depends(current_player),
    invitations: InvitationService = Depends(invitation_service),
) -> list[PendingInviteOut]:
    return invitations.list_mine(me.id)


@router.post("/invitations/{invitation_id}/accept", response_model=Ok)
def accept_invitation(
    invitation_id: int,
    me: Player = Depends(current_player),
    invitations: InvitationService = Depends(invitation_service),
) -> Ok:
    try:
        invitations.accept(invitation_id, me.id)
    except ServiceError as exc:
        raise _handle(exc)
    return Ok()


@router.post("/invitations/{invitation_id}/decline", response_model=Ok)
def decline_invitation(
    invitation_id: int,
    me: Player = Depends(current_player),
    invitations: InvitationService = Depends(invitation_service),
) -> Ok:
    try:
        invitations.decline(invitation_id, me.id)
    except ServiceError as exc:
        raise _handle(exc)
    return Ok()
