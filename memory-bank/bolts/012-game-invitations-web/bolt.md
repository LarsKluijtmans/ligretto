# Bolt 012 — game-invitations-web

- **Intent:** 002-player-invites-and-stats · **Unit:** 008 game-invitations · **Status:** planned
- **Created:** 2026-07-18T23:18:46Z
- **Depends on:** 011 game-invitations-api, 010 player-directory

## Goal
The web UI for inviting players and for responding to invitations.

## Stories
S-008-4 invite + pending-invites UI (web).

## Key deliverables
- Game setup: invite a searched player (reuses the PlayerCard/search from bolt 010) → shows as **pending**;
  host sees per-invite status (pending/accepted/declined) and can **cancel** a pending one.
- App-wide: a **pending-invites badge + list** (in the account menu / dashboard) with **Accept / Decline**;
  accepting adds the user to the game and it appears in their games/history.
- EN + NL for the invite dialog, pending-invites list, and statuses. Email never rendered anywhere.

## Definition of Done
Host invite shows pending and can be cancelled; an invitee sees the badge + list, can accept/decline, and
accepting seats them in the game; all new copy is EN/NL; no email is ever shown.
