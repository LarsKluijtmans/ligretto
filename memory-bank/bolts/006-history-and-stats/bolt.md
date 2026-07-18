# Bolt 006 — history-and-stats

- **Intent:** 001-ligretto-scorekeeper · **Unit:** 005 history-and-stats · **Status:** planned
- **Created:** 2026-07-18T17:41:43Z
- **Depends on:** 003 game-lifecycle, 004 scoring-engine

## Goal
The read-side: browse the history of every game, open full detail, and see player stats.

## Stories
S-005-1 history APIs · S-005-2 history UI · S-005-3 player stats (secondary).

## Key deliverables
- `GET /history` (all my games, active + completed, paginated); completed-game round-by-round detail.
- History UI: list (date, players, winner, final scores) + game-detail view with the full round grid.
- `GET /stats/me`: games played, wins, win rate, average score, best single round + a stats screen.

## Definition of Done
Only my games appear; a past game opens to its frozen round-by-round record; stat aggregates match the
underlying games.
