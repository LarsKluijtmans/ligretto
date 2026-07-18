# Units — 001-ligretto-scorekeeper

**Generated:** 2026-07-18T17:41:43Z

Five vertical units. Dependency order: **001 → 002 → 003 → 004 → 005** (002 is independent of 003+ and
can be built any time after 001).

| Unit | Name | Delivers (FR) | Depends on |
|---|---|---|---|
| 001 | app-foundation | FR-1, FR-2, FR-14 (shell) | — |
| 002 | rules | FR-3, FR-14 | 001 |
| 003 | game-lifecycle | FR-4, FR-5, FR-10, FR-11 | 001 |
| 004 | scoring | FR-6, FR-7, FR-8, FR-9 | 003 |
| 005 | history-and-stats | FR-12, FR-13 | 003, 004 |

---

## Unit 001 — app-foundation
Scaffold both tiers, wire platform auth, provision players, and stand up the app shell. Everything else
builds on this.

- **S-001-1 — Scaffold the two tiers.** React 19 + TS + Vite + MUI frontend and FastAPI + SQLAlchemy
  backend (Controllers→Services→Repositories), `.env(.example)`, Dockerfiles + compose, one-command dev
  run. *AC:* `docker compose up` serves the empty shell + `/api/v1/health` 200.
- **S-001-2 — Embedded PKCE sign-in.** Embed react-login; complete the PKCE flow; persist + refresh the
  token; unauthenticated users see a sign-in screen, authenticated users the app shell. *AC:* signing in
  through the platform lands back authenticated; refresh works; sign-out clears the session.
- **S-001-3 — Backend JWT validation.** A JWKS-cached dependency validates the access token (issuer,
  audience, exp, RS256) and yields the caller identity. `GET /api/v1/me` returns the identity. *AC:*
  no/invalid token → 401; valid token → identity from `sub`.
- **S-001-4 — Player provisioning + profile.** On first authenticated call, upsert a `player` keyed by
  `sub` (display name seeded from the token). `GET/PATCH /api/v1/me/profile` reads/updates display name.
  *AC:* first call creates exactly one player; display name editable.
- **S-001-5 — App shell + i18n + theme.** Routing, nav, mobile-first MUI theme, EN+NL i18n scaffolding,
  a language switch. *AC:* nav works; switching language re-labels the UI.

## Unit 002 — rules
The built-in Ligretto rules reference.

- **S-002-1 — Rules page.** A curated `/rules` page (setup, how to play, end of round, **scoring model**),
  fully EN+NL, mobile-readable, reachable from the nav. *AC:* both languages render; scoring section
  states `centre − 2×stack`.

## Unit 003 — game-lifecycle
Create + configure + close out games. Domain: `game`, `game_player`.

- **S-003-1 — Game domain + create.** `game` (host_player_id, name, target_type[rounds|points],
  target_value, status[active|completed|abandoned], timestamps) + `game_player` (game_id, seat, kind
  [account|guest], player_id?, guest_name?) models + migrations. `POST /api/v1/games` creates an active
  game scoped to the host. *AC:* host-scoped create; validation on target.
- **S-003-2 — Manage players (2–10).** Add/remove players — a **linked account** (lookup by display name)
  or a **guest name** — with seat order; enforce **2–10** and unique seats; no changes once round 1 is
  scored. *AC:* 2–10 enforced; guests + accounts both work; seat order preserved.
- **S-003-3 — My games + game setup UI.** `GET /api/v1/games` (my active/recent) + `GET /games/:id`
  (setup/detail); frontend dashboard, create-game wizard, add-players screen. *AC:* only my games listed;
  create flow produces a ready-to-score game.
- **S-003-4 — Finish / abandon.** `POST /games/:id/finish` (freeze + compute final standings + winner)
  and `POST /games/:id/abandon` (soft-delete). *AC:* finished games are immutable; abandoned games leave
  history intact but drop off the active list.

## Unit 004 — scoring
Round entry + the scoring engine + the live scoreboard. Domain: `round`, `round_score`.

- **S-004-1 — Scoring engine + domain.** `round` (game_id, number) + `round_score` (round_id,
  game_player_id, centre_cards, stack_left, computed_score) models + migrations. Pure engine:
  `score = centre_cards − 2 × stack_left`; cumulative totals; leader; **game-end detection** (rounds/points
  target). Server-computed only. *AC:* engine unit-tested incl. negatives + ties.
- **S-004-2 — Enter + correct a round.** `POST /games/:id/rounds` (per-player counts, or a direct net) →
  recompute totals; `PATCH /games/:id/rounds/:n` corrects a prior round (active games only). *AC:* totals
  recompute; correcting a round updates standings; net-entry path works.
- **S-004-3 — Scoreboard + round entry UI.** Running totals + per-round grid with leader highlight; a fast,
  mobile-first round-entry form (counts with auto-compute, or net). *AC:* one-handed round entry; live
  totals; grid shows every round.
- **S-004-4 — Game-end prompt.** When the target is reached, surface a "finish game" prompt showing the
  provisional winner. *AC:* prompt appears exactly at target; confirming routes to finish (S-003-4).

## Unit 005 — history-and-stats
Read-side over games/scores.

- **S-005-1 — History APIs.** `GET /api/v1/history` (all my games, active + completed, paginated) +
  `GET /games/:id` full round-by-round detail for completed games. *AC:* only my games; detail is the
  frozen record.
- **S-005-2 — History UI.** History list (date, players, winner, final scores) + a game-detail view with
  the full round grid. *AC:* browse + open any past game.
- **S-005-3 — Player stats (secondary).** `GET /api/v1/stats/me` — games played, wins, win rate, average
  score, best single round — + a stats screen. *AC:* aggregates match the underlying games.
