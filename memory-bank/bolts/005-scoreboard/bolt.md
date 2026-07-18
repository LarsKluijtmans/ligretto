# Bolt 005 — scoreboard

- **Intent:** 001-ligretto-scorekeeper · **Unit:** 004 scoring · **Status:** planned
- **Created:** 2026-07-18T17:41:43Z
- **Depends on:** 004 scoring-engine

## Goal
The player-facing scoring experience: live scoreboard, fast round entry, and the game-end prompt.

## Stories
S-004-3 scoreboard + round-entry UI · S-004-4 game-end prompt.

## Key deliverables
- Scoreboard: running totals + per-round grid with leader highlight.
- Round-entry form: mobile-first, one-handed; counts with auto-compute, or a direct net; optimistic-ish
  update.
- Game-end prompt when the target is reached, showing the provisional winner → routes to finish (003).

## Definition of Done
One-handed round entry on a phone; totals update live; the grid shows every round; the finish prompt
appears exactly at target and confirming completes the game.
