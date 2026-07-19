# Bolt 010 — player-directory

- **Intent:** 002-player-invites-and-stats · **Unit:** 007 player-directory-and-stats · **Status:** done
- **Created:** 2026-07-18T23:18:46Z · **Completed:** 2026-07-19T00:43:34Z
- **Depends on:** 001 app-foundation (players), 001 unit 005 (stats)

> **Done (2026-07-19):** `GET /api/v1/players/search` (name/email, min 2, capped, no email returned) +
> tie-aware `StatsService.win_rate_for` + email-prefix `display_name_for` fallback. Web: `PlayerCard`
> (icon + name + win rate, `action` slot for the future Invite button) + debounced `PlayerSearchField`,
> surfaced as a "Find players" discovery search in the add-players step. 37 backend tests pass; built +
> deployed live; search endpoint verified auth-guarded (401) + in OpenAPI. (Per-card **Invite** action is
> bolt 012, once the invitation domain exists.)

## Goal
Find existing Ligretto players and show a privacy-safe card: display name + icon + win rate.

## Stories
S-007-1 player search API · S-007-2 win-rate + public player stats · S-007-3 player card + search UI (web).

## Key deliverables
- `GET /api/v1/players/search?q=` — Ligretto players only, by display name OR email (min 2 chars, cap ~10);
  returns id + display_name (email-local-part fallback when blank) + icon + win_rate; **email never
  returned**.
- StatsService extended: win rate = wins ÷ completed games as a linked account-player (host incl.); tied
  top score counts as a win; 0 games → null/0; server-side + bounded.
- Web: reusable **PlayerCard** (icon + name + win rate) + a **debounced** search box in add-players that
  lists matches as cards and stages a selection. EN/NL. Email never rendered.

## Definition of Done
Search returns capped matches (incl. email-key matches) with NO email in the payload; `q` < 2 chars is
rejected/empty; win rate matches the underlying games incl. ties; card + debounced search render in EN/NL.
