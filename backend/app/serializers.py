"""Turn ORM `Game` objects into the contract's response shapes. Totals + leader are always
recomputed from the stored per-round scores via the pure scoring engine."""
from __future__ import annotations

from . import scoring
from .models import Game
from .schemas import (
    GameDetail,
    GamePlayerOut,
    GameSummary,
    RoundOut,
    RoundScoreOut,
)
from .services.player_directory_service import display_name_for


def _host_name(game: Game) -> str | None:
    """Public display name of the game's creator (email local-part fallback, never the raw email)."""
    return display_name_for(game.host) if game.host is not None else None


def _totals(game: Game) -> dict[int, int]:
    totals = {gp.id: 0 for gp in game.players}
    for rnd in game.rounds:
        for sc in rnd.scores:
            if sc.game_player_id in totals:
                totals[sc.game_player_id] += sc.computed_score
    return totals


def _name_for(game: Game, gp_id: int | None) -> str | None:
    if gp_id is None:
        return None
    for gp in game.players:
        if gp.id == gp_id:
            return gp.display_name
    return None


def to_summary(game: Game) -> GameSummary:
    totals = _totals(game)
    leader_ids = scoring.leaders(totals)
    leader_name = None
    if len(leader_ids) == 1:
        leader_name = _name_for(game, leader_ids[0])
    return GameSummary(
        id=game.id,
        name=game.name,
        status=game.status,
        target_type=game.target_type,
        target_value=game.target_value,
        player_count=len(game.players),
        current_round=len(game.rounds),
        leader_name=leader_name,
        host_name=_host_name(game),
        created_at=game.created_at,
    )


def to_detail(game: Game, viewer_player_id: int | None = None) -> GameDetail:
    totals = _totals(game)
    leader_ids = scoring.leaders(totals)
    leader_name = _name_for(game, leader_ids[0]) if len(leader_ids) == 1 else None

    players = [
        GamePlayerOut(
            id=gp.id,
            seat=gp.seat,
            kind=gp.kind,
            display_name=gp.display_name,
            total=totals.get(gp.id, 0),
        )
        for gp in sorted(game.players, key=lambda g: g.seat)
    ]
    rounds = [
        RoundOut(
            number=rnd.number,
            scores=[
                RoundScoreOut(
                    game_player_id=sc.game_player_id,
                    centre_cards=sc.centre_cards,
                    stack_left=sc.stack_left,
                    computed_score=sc.computed_score,
                )
                for sc in rnd.scores
            ],
        )
        for rnd in sorted(game.rounds, key=lambda r: r.number)
    ]
    game_over = scoring.is_game_over(
        game.target_type,
        game.target_value,
        completed_rounds=len(game.rounds),
        player_totals=totals,
    )
    return GameDetail(
        id=game.id,
        name=game.name,
        status=game.status,
        target_type=game.target_type,
        target_value=game.target_value,
        created_at=game.created_at,
        completed_at=game.completed_at,
        players=players,
        rounds=rounds,
        leader=leader_ids,
        leader_name=leader_name,
        host_name=_host_name(game),
        winner=game.winner_game_player_id,
        game_over=game_over,
        is_host=viewer_player_id is not None and game.host_player_id == viewer_player_id,
    )
