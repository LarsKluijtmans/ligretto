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
from ..security import Principal, verify_token
from ..serializers import to_detail, to_summary
from ..services.errors import ServiceError
from ..services.game_service import GameService
from ..services.usage_notifier import record_usage

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
    principal: Principal = Depends(verify_token),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        game = games.create_game(me.id, body)
    except ServiceError as exc:
        raise _handle(exc)
    record_usage(
        "game_created",
        subject=me.sub,
        project_id=principal.project_id,
        reference_1=game.target_type,            # game mode (endless/rounds/points) — the groupable segment
        metadata={"game_id": game.id, "players": len(game.players), "target_value": game.target_value},
    )
    return to_detail(game, me.id)


@router.get("/games/{game_id}", response_model=GameDetail)
def get_game(
    game_id: int,
    me: Player = Depends(current_player),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        return to_detail(games.get_game(game_id, me.id), me.id)
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
        return to_detail(games.add_player(game_id, me.id, body), me.id)
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
        return to_detail(games.remove_player(game_id, me.id, game_player_id), me.id)
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
        return to_detail(games.add_round(game_id, me.id, body.scores), me.id)
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
        return to_detail(games.correct_round(game_id, me.id, number, body.scores), me.id)
    except ServiceError as exc:
        raise _handle(exc)


@router.post("/games/{game_id}/finish", response_model=GameDetail)
def finish_game(
    game_id: int,
    me: Player = Depends(current_player),
    principal: Principal = Depends(verify_token),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        game = games.finish_game(game_id, me.id)
    except ServiceError as exc:
        raise _handle(exc)
    record_usage(
        "game_finished",
        subject=me.sub,
        project_id=principal.project_id,
        reference_1=game.target_type,            # game mode — the groupable segment
        quantity=max(len(game.rounds), 1),       # meter rounds played (platform requires quantity >= 1)
        metadata={"game_id": game.id, "players": len(game.players)},
    )
    return to_detail(game, me.id)


@router.post("/games/{game_id}/abandon", response_model=GameDetail)
def abandon_game(
    game_id: int,
    me: Player = Depends(current_player),
    principal: Principal = Depends(verify_token),
    games: GameService = Depends(game_service),
) -> GameDetail:
    try:
        game = games.abandon_game(game_id, me.id)
    except ServiceError as exc:
        raise _handle(exc)
    record_usage(
        "game_abandoned",
        subject=me.sub,
        project_id=principal.project_id,
        reference_1=game.target_type,            # game mode — the groupable segment
        quantity=max(len(game.rounds), 1),       # meter rounds played before abandoning (>= 1)
        metadata={"game_id": game.id, "players": len(game.players)},
    )
    return to_detail(game, me.id)
