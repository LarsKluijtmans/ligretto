# Bolt 004 — scoring-engine

- **Intent:** 001-ligretto-scorekeeper · **Unit:** 004 scoring · **Status:** planned
- **Created:** 2026-07-18T17:41:43Z
- **Depends on:** 003 game-lifecycle

## Goal
The round domain, the server-side scoring engine, and round entry/correction.

## Stories
S-004-1 scoring engine + round domain · S-004-2 enter + correct a round.

## Key deliverables
- Models + migrations: `round` (game_id, number), `round_score` (round_id, game_player_id, centre_cards,
  stack_left, computed_score).
- Pure engine: `score = centre_cards − 2 × stack_left`; cumulative totals; leader; game-end detection
  (rounds/points target). **Server-computed only** — never trust a client-sent total.
- `POST /games/:id/rounds` (per-player counts OR direct net), `PATCH /games/:id/rounds/:n` (active only).

## Definition of Done
Engine unit-tested incl. negatives + ties; entering a round recomputes standings; correcting a prior
round updates totals; net-entry path works; only active games are mutable.
