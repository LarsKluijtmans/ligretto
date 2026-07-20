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

    def me(self, player_id: int) -> StatsOut:
        # Games the caller HOSTED or ACCEPTED (intent 002) — so an invited player's stats span every
        # game they joined, not only games they hosted. We include ACTIVE games too, not just completed:
        # endless mode is the default (games stay 'active' until finished), so a completed-only view left
        # most players with all-zero stats and a hidden stats hero. avg score + best round now reflect
        # in-progress play (a live game counts its running total); wins/win rate stay over finished games
        # (an unfinished game has no winner yet).
        games: list[Game] = self.games.list_for_player(
            player_id, statuses=["active", "completed"]
        )
        completed = sum(1 for g in games if g.status == "completed")
        wins = 0
        round_scores: list[int] = []
        game_totals: list[int] = []
        best_round = 0

        for game in games:
            # Which seats represent me (an account seat linked to my player_id)?
            my_seat_ids = {
                gp.id for gp in game.players if gp.player_id == player_id
            }
            # winner_game_player_id is only set on a completed game, so this counts finished wins only.
            if game.winner_game_player_id in my_seat_ids:
                wins += 1

            my_total = 0
            scored = False
            for rnd in game.rounds:
                for sc in rnd.scores:
                    if sc.game_player_id in my_seat_ids:
                        round_scores.append(sc.computed_score)
                        my_total += sc.computed_score
                        best_round = max(best_round, sc.computed_score)
                        scored = True
            # Only games where I actually have scored rounds feed the average, so a freshly-created
            # (unscored) game doesn't drag it toward zero.
            if scored:
                game_totals.append(my_total)

        win_rate = (wins / completed) if completed else 0.0
        avg_score = (sum(game_totals) / len(game_totals)) if game_totals else 0.0
        if not round_scores:
            best_round = 0

        return StatsOut(
            games_played=completed,
            wins=wins,
            win_rate=round(win_rate, 4),
            avg_score=round(avg_score, 2),
            best_round=best_round,
        )

    def win_rate_for(self, player_id: int) -> tuple[int, int, float | None]:
        """A player's public win rate: (games_played, wins, win_rate|None) over completed games
        they were an account-seat in. A TIED top total counts as a win for each co-leader (per the
        intent's win definition — the single `winner_game_player_id` is intentionally NOT used, since
        it is null on ties). `win_rate` is None when they have no scored completed games."""
        games = self.games.list_completed_seating(player_id)
        played = 0
        wins = 0
        for game in games:
            if not any(gp.scores for gp in game.players):
                continue  # degenerate: completed but no rounds scored
            totals = {gp.id: sum(sc.computed_score for sc in gp.scores) for gp in game.players}
            played += 1
            top = max(totals.values())
            my_seat_ids = {gp.id for gp in game.players if gp.player_id == player_id}
            if any(totals.get(sid) == top for sid in my_seat_ids):
                wins += 1
        win_rate = round(wins / played, 4) if played else None
        return played, wins, win_rate
