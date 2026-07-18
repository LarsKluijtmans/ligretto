"""GET /api/v1/history — the caller's games (active + completed), newest first, paginated.
GET /api/v1/stats/me — aggregate stats for the caller."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..deps import current_player, game_service, stats_service
from ..models import Player
from ..schemas import GameSummary, StatsOut
from ..serializers import to_summary
from ..services.game_service import GameService
from ..services.stats_service import StatsService

router = APIRouter(prefix="/api/v1", tags=["history"])


@router.get("/history", response_model=list[GameSummary])
def history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> list[GameSummary]:
    return [
        to_summary(g)
        for g in games.history(me.id, limit=limit, offset=offset)
    ]


@router.get("/stats/me", response_model=StatsOut)
def stats_me(
    me: Player = Depends(current_player),
    stats: StatsService = Depends(stats_service),
) -> StatsOut:
    return stats.me(me.id, me.id)
