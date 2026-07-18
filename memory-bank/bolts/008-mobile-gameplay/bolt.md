# Bolt 008 — mobile-gameplay

- **Intent:** 001-ligretto-scorekeeper · **Unit:** 006 mobile-app · **Status:** planned
- **Created:** 2026-07-18T17:41:43Z
- **Depends on:** 007 mobile-foundation

## Goal
The core mobile loop: rules, host a game, and score it on a phone.

## Stories
S-006-2 rules + games (mobile) · S-006-3 scoreboard + round entry (mobile).

## Key deliverables
- Rules screen (EN/NL); create/host game (name, target), add players (2–10, accounts or guests),
  my-games list.
- Touch-optimised round entry (counts w/ auto-compute or net) + live scoreboard + game-end prompt +
  finish. Reuses the web API contract verbatim (no backend changes).

## Definition of Done
Score a full game on a device; totals match the server; a game created on mobile is the same record the
web app sees; finishing freezes it.
