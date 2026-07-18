"""FastAPI `Depends()` wiring: DB session -> repositories -> services, plus the current
player (provisioned on demand). Controllers receive services + the caller's player through
these helpers, mirroring the platform's `core/dependencies.py`."""
from __future__ import annotations

from fastapi import Depends
from sqlalchemy.orm import Session

from .database import get_db
from .models import Player
from .repositories.game import GameRepository
from .repositories.player import PlayerRepository
from .repositories.round import RoundRepository
from .security import Principal, verify_token
from .services.game_service import GameService
from .services.player_service import PlayerService
from .services.stats_service import StatsService


def player_service(db: Session = Depends(get_db)) -> PlayerService:
    return PlayerService(PlayerRepository(db))


def game_service(db: Session = Depends(get_db)) -> GameService:
    return GameService(GameRepository(db), RoundRepository(db))


def stats_service(db: Session = Depends(get_db)) -> StatsService:
    return StatsService(GameRepository(db))


def current_player(
    principal: Principal = Depends(verify_token),
    players: PlayerService = Depends(player_service),
) -> Player:
    """Provision (idempotently) and return the caller's local player row."""
    return players.provision(principal)
