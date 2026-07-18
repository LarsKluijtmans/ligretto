"""Pure Ligretto scoring engine — no database, no framework. Fully unit-testable.

Ligretto round scoring: a player earns +1 for every card they played to the centre and
loses 2 for every card left in their Ligretto stack:

    round_score = centre_cards - 2 * stack_left

A caller may instead supply a pre-computed `net` (e.g. from a physical tally); when `net`
is given it is used verbatim and the two counts are ignored.

Totals, leader, and game-end are all derived from the per-round scores here so the server
never trusts a client-sent total.
"""
from __future__ import annotations

from dataclasses import dataclass, field


def round_score(
    centre_cards: int = 0, stack_left: int = 0, *, net: int | None = None
) -> int:
    """Score for a single player in a single round.

    If `net` is provided it wins (direct entry); otherwise compute from the counts.
    """
    if net is not None:
        return int(net)
    return int(centre_cards) - 2 * int(stack_left)


def totals(
    per_round: dict[int, list[int]],
) -> dict[int, int]:
    """Sum each player's round scores.

    `per_round` maps round-number -> list is NOT the shape; instead we take a mapping of
    game_player_id -> list of that player's round scores. Kept generic: any int key works.
    """
    return {gp_id: sum(scores) for gp_id, scores in per_round.items()}


def leaders(player_totals: dict[int, int]) -> list[int]:
    """Return the list of game_player_ids sharing the max total (ties allowed).

    Empty input -> empty list.
    """
    if not player_totals:
        return []
    top = max(player_totals.values())
    return [gp_id for gp_id, total in player_totals.items() if total == top]


def is_game_over(
    target_type: str,
    target_value: int,
    *,
    completed_rounds: int,
    player_totals: dict[int, int],
) -> bool:
    """Has the game reached its end condition?

    - 'rounds': over when the number of completed rounds >= target_value.
    - 'points': over when any player's total >= target_value.
    """
    if target_type == "rounds":
        return completed_rounds >= target_value
    if target_type == "points":
        return any(total >= target_value for total in player_totals.values())
    raise ValueError(f"unknown target_type: {target_type!r}")


@dataclass
class Standing:
    game_player_id: int
    total: int
    rank: int = 0


@dataclass
class Standings:
    rows: list[Standing] = field(default_factory=list)
    winner_ids: list[int] = field(default_factory=list)

    @property
    def winner_id(self) -> int | None:
        """The single winner, or None on an empty game or an unbroken tie."""
        if len(self.winner_ids) == 1:
            return self.winner_ids[0]
        return None


def standings(player_totals: dict[int, int]) -> Standings:
    """Rank players by total (highest first). `winner_ids` is the set of top-scorers."""
    rows = [
        Standing(game_player_id=gp_id, total=total)
        for gp_id, total in player_totals.items()
    ]
    rows.sort(key=lambda r: r.total, reverse=True)
    # dense-ish ranking: same total shares a rank
    last_total: int | None = None
    rank = 0
    for i, row in enumerate(rows, start=1):
        if row.total != last_total:
            rank = i
            last_total = row.total
        row.rank = rank
    return Standings(rows=rows, winner_ids=leaders(player_totals))
