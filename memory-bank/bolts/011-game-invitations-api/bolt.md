# Bolt 011 — game-invitations-api

- **Intent:** 002-player-invites-and-stats · **Unit:** 008 game-invitations · **Status:** planned
- **Created:** 2026-07-18T23:18:46Z
- **Depends on:** 010 player-directory, 001 unit 003 (games)

## Goal
The accept-required invitation domain + consent-safe cross-user stats/history (server side).

## Stories
S-008-1 invitation domain + host actions · S-008-2 invitee accept / decline · S-008-3 consent-safe stats +
history wiring.

## Key deliverables
- Model + migration/reconcile: `game_invitation` (game_id, inviter_player_id, invitee_player_id,
  status[pending|accepted|declined|cancelled], created_at, responded_at?); unique non-terminal
  (game_id, invitee) — no duplicate pending.
- Host: `POST /games/:id/invitations` (invite an existing found player → pending), `GET
  /games/:id/invitations`, `DELETE /games/:id/invitations/:iid` (cancel pending). Host-only → else 404.
- Invitee: `GET /invitations` (my pending — inviter + game name, **no scores**), `POST
  /invitations/:iid/accept` (seat me as a `kind='account'` game_player), `POST /invitations/:iid/decline`.
- Stats/history extended: accepted games count in the invitee's `GET /history` + `GET /stats/me` + the
  card win-rate; invited/declined/pending never affect a record.

## Definition of Done
Duplicate pending rejected; non-host → 404; accept seats exactly one account-player (no double-accept) and
a pending invitee cannot read scores until accepted; decline never seats; after accept+finish the game
counts in the invitee's history/win-rate; repository row-scoping + consent rules tested.
