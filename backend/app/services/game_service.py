"""Game lifecycle + scoring orchestration.

Every method that touches a specific game takes the caller's `host_player_id` and resolves
the game host-scoped; a miss raises NotFound (-> 404), so isolation is enforced here and in
the repository, never leaking a 403.

Scoring is delegated to the pure `app.scoring` engine — the DB stores the computed values
but the server always recomputes; a client-sent total is never trusted.
"""
from __future__ import annotations

from datetime import datetime, timezone

from .. import scoring
from ..models import Game, GamePlayer, RoundScore
from ..repositories.game import GameRepository
from ..repositories.round import RoundRepository
from ..schemas import CreateGameIn, NewPlayerIn, ScoreEntryIn
from .errors import BadRequest, Conflict, NotFound

MIN_PLAYERS = 2
MAX_PLAYERS = 10


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class GameService:
    def __init__(self, games: GameRepository, rounds: RoundRepository) -> None:
        self.games = games
        self.rounds = rounds

    # --- helpers -----------------------------------------------------------------

    def _require_game(self, game_id: int, host_player_id: int) -> Game:
        game = self.games.get_for_host(game_id, host_player_id)
        if game is None:
            raise NotFound("game not found")
        return game

    @staticmethod
    def player_totals(game: Game) -> dict[int, int]:
        """game_player_id -> summed computed_score across all rounds."""
        totals = {gp.id: 0 for gp in game.players}
        for rnd in game.rounds:
            for sc in rnd.scores:
                if sc.game_player_id in totals:
                    totals[sc.game_player_id] += sc.computed_score
        return totals

    @staticmethod
    def _first_round_scored(game: Game) -> bool:
        return any(rnd.scores for rnd in game.rounds)

    # --- lifecycle ---------------------------------------------------------------

    def create_game(self, host_player_id: int, data: CreateGameIn) -> Game:
        n = len(data.players)
        if n < MIN_PLAYERS or n > MAX_PLAYERS:
            raise BadRequest(
                f"a game needs {MIN_PLAYERS}..{MAX_PLAYERS} players (got {n})"
            )
        game = Game(
            host_player_id=host_player_id,
            name=data.name,
            target_type=data.target_type,
            target_value=data.target_value,
            status="active",
        )
        self.games.add(game)
        for seat, p in enumerate(data.players, start=1):
            self.games.add_game_player(
                GamePlayer(
                    game_id=game.id,
                    seat=seat,
                    kind=p.kind,
                    guest_name=p.display_name if p.kind == "guest" else None,
                    display_name=p.display_name,
                )
            )
        self.games.commit()
        return self._require_game(game.id, host_player_id)

    def get_game(self, game_id: int, host_player_id: int) -> Game:
        return self._require_game(game_id, host_player_id)

    def list_games(self, host_player_id: int) -> list[Game]:
        return self.games.list_for_host(host_player_id)

    def history(
        self, host_player_id: int, *, limit: int = 50, offset: int = 0
    ) -> list[Game]:
        return self.games.list_for_host(
            host_player_id,
            statuses=["active", "completed"],
            limit=limit,
            offset=offset,
        )

    # --- players -----------------------------------------------------------------

    def add_player(
        self, game_id: int, host_player_id: int, data: NewPlayerIn
    ) -> Game:
        game = self._require_game(game_id, host_player_id)
        if game.status != "active":
            raise Conflict("cannot modify a finished game")
        if self._first_round_scored(game):
            raise Conflict("cannot add players after round 1 is scored")
        if len(game.players) >= MAX_PLAYERS:
            raise BadRequest(f"a game allows at most {MAX_PLAYERS} players")
        next_seat = max((gp.seat for gp in game.players), default=0) + 1
        self.games.add_game_player(
            GamePlayer(
                game_id=game.id,
                seat=next_seat,
                kind=data.kind,
                guest_name=data.display_name if data.kind == "guest" else None,
                display_name=data.display_name,
            )
        )
        self.games.commit()
        return self._require_game(game_id, host_player_id)

    def remove_player(
        self, game_id: int, host_player_id: int, game_player_id: int
    ) -> Game:
        game = self._require_game(game_id, host_player_id)
        if game.status != "active":
            raise Conflict("cannot modify a finished game")
        if self._first_round_scored(game):
            raise Conflict("cannot remove players after round 1 is scored")
        target = next((gp for gp in game.players if gp.id == game_player_id), None)
        if target is None:
            raise NotFound("player not in this game")
        if len(game.players) - 1 < MIN_PLAYERS:
            raise BadRequest(f"a game needs at least {MIN_PLAYERS} players")
        self.games.delete_game_player(target)
        self.games.commit()
        return self._require_game(game_id, host_player_id)

    # --- rounds ------------------------------------------------------------------

    def _apply_scores(
        self, game: Game, round_id: int, entries: list[ScoreEntryIn]
    ) -> None:
        valid_ids = {gp.id for gp in game.players}
        seen: set[int] = set()
        for e in entries:
            if e.game_player_id not in valid_ids:
                raise BadRequest(
                    f"game_player_id {e.game_player_id} is not in this game"
                )
            if e.game_player_id in seen:
                raise BadRequest(
                    f"duplicate score for game_player_id {e.game_player_id}"
                )
            seen.add(e.game_player_id)
            computed = scoring.round_score(
                centre_cards=e.centre_cards or 0,
                stack_left=e.stack_left or 0,
                net=e.net,
            )
            self.rounds.add_score(
                RoundScore(
                    round_id=round_id,
                    game_player_id=e.game_player_id,
                    centre_cards=e.centre_cards or 0,
                    stack_left=e.stack_left or 0,
                    computed_score=computed,
                )
            )

    def add_round(
        self, game_id: int, host_player_id: int, entries: list[ScoreEntryIn]
    ) -> Game:
        game = self._require_game(game_id, host_player_id)
        if game.status != "active":
            raise Conflict("cannot score a finished game")
        if not entries:
            raise BadRequest("a round needs at least one score")
        next_number = max((r.number for r in game.rounds), default=0) + 1
        rnd = self.rounds.add(game.id, next_number)
        self._apply_scores(game, rnd.id, entries)
        self.games.commit()
        return self._require_game(game_id, host_player_id)

    def correct_round(
        self,
        game_id: int,
        host_player_id: int,
        number: int,
        entries: list[ScoreEntryIn],
    ) -> Game:
        game = self._require_game(game_id, host_player_id)
        if game.status != "active":
            raise Conflict("cannot correct a finished game")
        rnd = self.rounds.get(game.id, number)
        if rnd is None:
            raise NotFound("round not found")
        if not entries:
            raise BadRequest("a round needs at least one score")
        self.rounds.clear_scores(rnd.id)
        self._apply_scores(game, rnd.id, entries)
        self.games.commit()
        return self._require_game(game_id, host_player_id)

    # --- finish / abandon --------------------------------------------------------

    def finish_game(self, game_id: int, host_player_id: int) -> Game:
        game = self._require_game(game_id, host_player_id)
        if game.status == "abandoned":
            raise Conflict("game was abandoned")
        totals = self.player_totals(game)
        result = scoring.standings(totals)
        game.winner_game_player_id = result.winner_id  # None on empty or unbroken tie
        game.status = "completed"
        game.completed_at = _utcnow()
        self.games.commit()
        return self._require_game(game_id, host_player_id)

    def abandon_game(self, game_id: int, host_player_id: int) -> Game:
        game = self._require_game(game_id, host_player_id)
        if game.status == "completed":
            raise Conflict("game already completed")
        game.status = "abandoned"
        game.completed_at = _utcnow()
        self.games.commit()
        return self._require_game(game_id, host_player_id)
