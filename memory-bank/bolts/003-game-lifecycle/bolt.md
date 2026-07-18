# Bolt 003 — game-lifecycle

- **Intent:** 001-ligretto-scorekeeper · **Unit:** 003 game-lifecycle · **Status:** planned
- **Created:** 2026-07-18T17:41:43Z
- **Depends on:** 001 app-foundation

## Goal
Create, configure, and close out games.

## Stories
S-003-1 game domain + create · S-003-2 manage players (2–10, accounts + guests) · S-003-3 my-games + setup
UI · S-003-4 finish / abandon.

## Key deliverables
- Models + migrations: `game` (host, name, target_type[rounds|points], target_value, status, timestamps),
  `game_player` (game_id, seat, kind[account|guest], player_id?/guest_name?).
- `POST /games`, player add/remove (2–10, unique seats, account-lookup or guest), `GET /games` (mine),
  `GET /games/:id`, `POST /games/:id/finish`, `POST /games/:id/abandon`.
- Frontend: dashboard, create-game wizard, add-players screen. Host-only mutation, host/participant read,
  else 404.

## Definition of Done
2–10 enforced; accounts + guests both work; only my games listed; finished games immutable; abandoned
games leave history intact; repository row-scoping tested.
