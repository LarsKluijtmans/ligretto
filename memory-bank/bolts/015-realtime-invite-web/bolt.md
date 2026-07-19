# Bolt 015 — realtime-invite-web

- **Intent:** 002-player-invites-and-stats · **Unit:** 010 realtime-invite-notifications · **Status:** planned
- **Created:** 2026-07-18T23:18:46Z
- **Depends on:** 014 realtime-invite-backend, 012 game-invitations-web

## Goal
The web live experience: an instant toast + a live pending-invites badge when you're invited.

## Stories
S-010-2 web live toast + badge.

## Key deliverables
- Subscribe to `GET /api/v1/events` using a **fetch-stream reader** with the Bearer token (NOT a
  token-in-URL `EventSource`); on `invitation.created`, show a **toast** ("{inviter} invited you to a
  game") and **increment the pending-invites badge** with no refresh.
- Reconnect on drop; on (re)connect reconcile the badge from `GET /invitations` so it always matches the
  authoritative pending list. EN + NL.

## Definition of Done
Being invited while the app is open pops a toast and bumps the badge live (no refresh); after a dropped +
restored connection the badge still equals the pending list; the stream carries the auth token in a
header, never the URL.
