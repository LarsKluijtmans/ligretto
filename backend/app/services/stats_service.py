"""Per-player stats aggregated across the caller's hosted games.

Stats are computed over the host's own game_player seat(s). A game may seat the host as an
'account' player linked to their player_id; when present we track that seat's scores. If the
host isn't seated we still count games hosted/won by winner attribution.
"""
from __future__ import annotations

from ..models import Game
from ..repositories.game import GameRepository
from ..schemas import StatsOut


class StatsService:
    def __init__(self, games: GameRepository) -> None:
        self.games = games

    def me(self, host_player_id: int, player_id: int) -> StatsOut:
        games: list[Game] = self.games.list_for_host(
            host_player_id, statuses=["completed"]
        )
        games_played = len(games)
        wins = 0
        round_scores: list[int] = []
        game_totals: list[int] = []
        best_round = 0

        for game in games:
            # Which seats represent me (an account seat linked to my player_id)?
            my_seat_ids = {
                gp.id for gp in game.players if gp.player_id == player_id
            }
            if game.winner_game_player_id in my_seat_ids:
                wins += 1

            my_total = 0
            has_seat = bool(my_seat_ids)
            for rnd in game.rounds:
                for sc in rnd.scores:
                    if sc.game_player_id in my_seat_ids:
                        round_scores.append(sc.computed_score)
                        my_total += sc.computed_score
                        best_round = max(best_round, sc.computed_score)
            if has_seat:
                game_totals.append(my_total)

        win_rate = (wins / games_played) if games_played else 0.0
        avg_score = (sum(game_totals) / len(game_totals)) if game_totals else 0.0
        if not round_scores:
            best_round = 0

        return StatsOut(
            games_played=games_played,
            wins=wins,
            win_rate=round(win_rate, 4),
            avg_score=round(avg_score, 2),
            best_round=best_round,
        )
