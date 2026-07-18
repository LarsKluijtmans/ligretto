"""GET /api/v1/me — validate the token and PROVISION a local player row (keyed by `sub`) on
first call; PATCH /api/v1/me/profile updates the display name.

The profile is enriched from auth-api (M2M) best-effort; whatever display name we resolve is
persisted onto the local player so games can show it."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ..config import settings
from ..deps import player_service
from ..project_logger import log_event
from ..schemas import MeOut, ProfileUpdateIn
from ..security import Principal, verify_token
from ..services.player_service import PlayerService

router = APIRouter(prefix="/api/v1", tags=["me"])


@router.get("/me", response_model=MeOut)
def get_me(
    principal: Principal = Depends(verify_token),
    players: PlayerService = Depends(player_service),
) -> MeOut:
    player = players.provision(principal)

    # Best-effort enrichment from auth-api: prefer the platform display name on first sight.
    if (
        settings.enable_enrichment
        and principal.is_user
        and principal.project_id
        and player.display_name in ("", principal.sub)
    ):
        try:
            from ..admin import get_admin

            user = get_admin().users.get(principal.project_id, principal.sub)
            if user.display_name:
                player = players.update_profile(principal, user.display_name)
        except Exception:
            pass

    log_event(
        "info",
        "me.viewed",
        project_id=principal.project_id,
        metadata={"sub": principal.sub},
    )
    return MeOut(sub=player.sub, display_name=player.display_name, email=player.email)


@router.patch("/me/profile", response_model=MeOut)
def update_profile(
    body: ProfileUpdateIn,
    principal: Principal = Depends(verify_token),
    players: PlayerService = Depends(player_service),
) -> MeOut:
    player = players.update_profile(principal, body.display_name)
    return MeOut(sub=player.sub, display_name=player.display_name, email=player.email)
