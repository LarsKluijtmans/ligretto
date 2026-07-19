"""Unit tests for the pure scoring engine — negatives, ties, and game-end for both target
types. No DB, no app."""
from __future__ import annotations

import pytest

from app import scoring


def test_round_score_from_counts():
    assert scoring.round_score(centre_cards=10, stack_left=0) == 10
    assert scoring.round_score(centre_cards=10, stack_left=3) == 4  # 10 - 6


def test_round_score_can_go_negative():
    # 2 centre, 5 left in stack -> 2 - 10 = -8
    assert scoring.round_score(centre_cards=2, stack_left=5) == -8


def test_round_score_net_overrides_counts():
    # net wins verbatim even when counts are also present
    assert scoring.round_score(centre_cards=99, stack_left=99, net=-3) == -3
    assert scoring.round_score(net=7) == 7


def test_totals_sums_per_player():
    per = {1: [10, -8, 5], 2: [2, 2, 2]}
    assert scoring.totals(per) == {1: 7, 2: 6}


def test_leaders_single():
    assert scoring.leaders({1: 10, 2: 5, 3: 8}) == [1]


def test_leaders_tie():
    assert sorted(scoring.leaders({1: 10, 2: 10, 3: 8})) == [1, 2]


def test_leaders_empty():
    assert scoring.leaders({}) == []


def test_game_over_rounds():
    totals = {1: 5, 2: 3}
    assert not scoring.is_game_over("rounds", 5, completed_rounds=4, player_totals=totals)
    assert scoring.is_game_over("rounds", 5, completed_rounds=5, player_totals=totals)
    assert scoring.is_game_over("rounds", 5, completed_rounds=6, player_totals=totals)


def test_game_over_points():
    assert not scoring.is_game_over(
        "points", 100, completed_rounds=3, player_totals={1: 99, 2: 40}
    )
    assert scoring.is_game_over(
        "points", 100, completed_rounds=3, player_totals={1: 100, 2: 40}
    )
    assert scoring.is_game_over(
        "points", 100, completed_rounds=3, player_totals={1: 250, 2: 40}
    )


def test_game_over_endless_never_ends():
    # Endless games never auto-end regardless of rounds played or scores reached.
    assert not scoring.is_game_over("endless", 0, completed_rounds=0, player_totals={})
    assert not scoring.is_game_over(
        "endless", 0, completed_rounds=99, player_totals={1: 10_000, 2: 5}
    )


def test_game_over_unknown_type():
    with pytest.raises(ValueError):
        scoring.is_game_over("bogus", 1, completed_rounds=1, player_totals={})


def test_standings_ranks_and_winner():
    s = scoring.standings({1: 10, 2: 30, 3: 20})
    assert [r.game_player_id for r in s.rows] == [2, 3, 1]
    assert [r.rank for r in s.rows] == [1, 2, 3]
    assert s.winner_id == 2


def test_standings_tie_has_no_single_winner():
    s = scoring.standings({1: 30, 2: 30, 3: 10})
    assert sorted(s.winner_ids) == [1, 2]
    assert s.winner_id is None
    # tied players share rank 1
    ranks = {r.game_player_id: r.rank for r in s.rows}
    assert ranks[1] == 1 and ranks[2] == 1 and ranks[3] == 3
