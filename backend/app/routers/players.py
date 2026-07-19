"""GET /api/v1/players/search — find existing Ligretto players (by display name or email) to invite.
Returns public cards only: display name + icon + win rate. The email is a search key and is NEVER
returned. Any signed-in user may search; results are bounded and require a real query."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..deps import player_directory_service
from ..schemas import PlayerCard
from ..security import Principal, verify_token
from ..services.player_directory_service import PlayerDirectoryService

router = APIRouter(prefix="/api/v1", tags=["players"])


@router.get("/players/search", response_model=list[PlayerCard])
def search_players(
    q: str = Query(default="", max_length=255),
    _principal: Principal = Depends(verify_token),
    directory: PlayerDirectoryService = Depends(player_directory_service),
) -> list[PlayerCard]:
    return directory.search(q)
