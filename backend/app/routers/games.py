"""Game endpoints — create/list/read, players, rounds, finish/abandon.

Every route is host-scoped through the service: a game that isn't the caller's resolves to
404 (never 403). Service exceptions carry an HTTP status and are translated here."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from ..deps import current_player, game_service
from ..models import Player
from ..schemas import (
    CreateGameIn,
    GameDetail,
    GameSummary,
    NewPlayerIn,
    Ok,
    RoundScoresIn,
)
from ..serializers import to_detail, to_summary
from ..services.errors import ServiceError
from ..services.game_service import GameService

router = APIRouter(prefix="/api/v1", tags=["games"])


def _handle(exc: ServiceError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.get("/games", response_model=list[GameSummary])
def list_games(
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> list[GameSummary]:
    return [to_summary(g) for g in games.list_games(me.id)]


@router.post("/games", response_model=GameDetail, status_code=201)
def create_game(
    body: CreateGameIn,
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        game = games.create_game(me.id, body)
    except ServiceError as exc:
        raise _handle(exc)
    return to_detail(game)


@router.get("/games/{game_id}", response_model=GameDetail)
def get_game(
    game_id: int,
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        return to_detail(games.get_game(game_id, me.id))
    except ServiceError as exc:
        raise _handle(exc)


@router.post("/games/{game_id}/players", response_model=GameDetail)
def add_player(
    game_id: int,
    body: NewPlayerIn,
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        return to_detail(games.add_player(game_id, me.id, body))
    except ServiceError as exc:
        raise _handle(exc)


@router.delete("/games/{game_id}/players/{game_player_id}", response_model=GameDetail)
def remove_player(
    game_id: int,
    game_player_id: int,
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        return to_detail(games.remove_player(game_id, me.id, game_player_id))
    except ServiceError as exc:
        raise _handle(exc)


@router.post("/games/{game_id}/rounds", response_model=GameDetail)
def add_round(
    game_id: int,
    body: RoundScoresIn,
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        return to_detail(games.add_round(game_id, me.id, body.scores))
    except ServiceError as exc:
        raise _handle(exc)


@router.patch("/games/{game_id}/rounds/{number}", response_model=GameDetail)
def correct_round(
    game_id: int,
    number: int,
    body: RoundScoresIn,
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        return to_detail(games.correct_round(game_id, me.id, number, body.scores))
    except ServiceError as exc:
        raise _handle(exc)


@router.post("/games/{game_id}/finish", response_model=GameDetail)
def finish_game(
    game_id: int,
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        return to_detail(games.finish_game(game_id, me.id))
    except ServiceError as exc:
        raise _handle(exc)


@router.post("/games/{game_id}/abandon", response_model=GameDetail)
def abandon_game(
    game_id: int,
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        return to_detail(games.abandon_game(game_id, me.id))
    except ServiceError as exc:
        raise _handle(exc)
