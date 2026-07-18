# Bolt 002 — rules

- **Intent:** 001-ligretto-scorekeeper · **Unit:** 002 rules · **Status:** planned
- **Created:** 2026-07-18T17:41:43Z
- **Depends on:** 001 app-foundation

## Goal
Ship the built-in Ligretto rules reference.

## Stories
S-002-1 curated rules page (EN/NL).

## Key deliverables
- `/rules` route: setup, how to play, end of round, and the **scoring model** (`centre − 2×stack`).
- Fully EN + NL; mobile-readable; linked from the nav.

## Definition of Done
Both languages render; the scoring section matches the engine (`score = centre_cards − 2 × stack_left`).
