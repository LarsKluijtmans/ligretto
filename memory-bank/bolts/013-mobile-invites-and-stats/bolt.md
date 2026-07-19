# Bolt 013 — mobile-invites-and-stats

- **Intent:** 002-player-invites-and-stats · **Unit:** 009 mobile-invites-and-stats *(optional parity)* · **Status:** planned
- **Created:** 2026-07-18T23:18:46Z
- **Depends on:** 011 game-invitations-api, 010 player-directory (API)

## Goal
Native mobile parity for search + invite + accept/decline + shared stats — over the SAME `ligretto-api`.
No new backend. **Optional** — cut if mobile is out of scope for this intent.

## Stories
S-009-1 mobile search + invite · S-009-2 mobile pending-invites + accept/decline.

## Key deliverables
- Mobile add-players **search** (player cards: icon + name + win rate) + **invite**; host sees statuses.
- A pending-invites screen/badge with **accept / decline**; accepting joins the game and the shared
  history/stats reflect it. EN/NL; email never rendered.

## Definition of Done
From a phone: invite a player (pending shows), and an invitee can accept/decline — accepting seats them and
their history/stats show the game. Uses the web bolt's API verbatim; no backend change.
