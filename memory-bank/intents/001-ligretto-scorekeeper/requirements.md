# Requirements — 001-ligretto-scorekeeper

**Intent:** Ligretto Scorekeeper — a mobile-first web app to look up the Ligretto card game + rules, sign
in, host a game, add players, keep score round-by-round with the real Ligretto scoring model, and browse
a history of every game played.

**Generated:** 2026-07-18T17:41:43Z · **Checkpoint 2 (Requirements Review)**

---

## Direction (from Checkpoint 1)

| Decision | Choice |
|---|---|
| **Auth** | Build on the existing auth platform — users sign in via hosted **react-login** (PKCE); the JWT `sub` is the identity. **No auth is built in this app.** |
| **Game scope** | **Ligretto-focused** — built-in rules page + the real Ligretto scoring model. |
| **Multiplayer model** | **One scorekeeper per game** — the host adds players and enters each round's scores. No realtime. |
| **Stack** | **app-starter pattern** — React + Vite + MUI frontend (embedded react-login) + FastAPI + SQLAlchemy backend + platform SDKs, in a new sibling repo (`../ligretto`). |

---

## The game (reference — drives the scoring engine)

Ligretto is a fast, real-time card game. For **this app's purposes** only the *scoring* matters:
- A game is played over several **rounds**. Each round, players race to empty their 10-card "Ligretto
  stack" onto shared centre rows.
- **Per-round score for a player = (cards they played to the centre rows) − 2 × (cards left in their
  Ligretto stack).** (Cards left in the stack are penalised; cards played are rewarded.)
- Cumulative score = sum of round scores. The game ends at a **target** (a set number of rounds, or a
  points target — configurable), and the highest total wins.

The app does NOT simulate play — it records the two counts per player per round and computes the score.

---

## Functional Requirements

### Identity & profile
- **FR-1 — Sign in via the platform.** Users authenticate through the hosted login portal (react-login
  PKCE). The backend validates the login-api JWT against cached JWKS; identity is the JWT `sub`. The app
  stores no passwords.
- **FR-2 — Player profile.** On first sign-in the app creates a player record keyed by `sub`, with a
  **display name** (seeded from the token, editable). Used to label the host in games and for stats.

### Rules
- **FR-3 — Rules lookup.** A built-in, curated **Ligretto rules page**: setup, how to play, end of a
  round, and the scoring model. Static content (no external API). Reachable without starting a game.

### Games
- **FR-4 — Create a game (host).** A signed-in user creates a game: optional name, a **target**
  (rounds-based *or* points-based), and a starting set of players. The creator is the **host/scorekeeper**.
- **FR-5 — Players in a game.** The host adds **2–10 players**. Each player is either a **linked account**
  (looked up by display name) or an **ad-hoc guest name** (no account needed). Seat order is preserved.
- **FR-6 — Enter round scores.** For each round, the host enters per player: **cards played to centre**
  and **cards left in the Ligretto stack**; the app computes the round score. A **direct net-score**
  entry is also allowed for speed.
- **FR-7 — Scoring engine.** Compute per-round + cumulative totals, current leader, and detect
  **game-end** (target rounds reached or points target hit).
- **FR-8 — Live scoreboard.** During a game, show running totals + a per-round breakdown grid; highlight
  the leader and any player over/under thresholds.
- **FR-9 — Correct a round.** The host can edit a round's entries while the game is in progress
  (mis-entry correction); totals recompute.
- **FR-10 — Finish a game.** Mark the game complete → record final standings + winner and freeze scores.
- **FR-11 — Abandon a game.** The host can abandon/delete an in-progress game (soft-delete to keep
  history integrity).

### History & stats
- **FR-12 — Game history.** Every game (in-progress + completed) is persisted. Users browse a history of
  **all their games** (as host, and — for linked accounts — games they played in): date, players, final
  scores, winner. Open any completed game to see the full **round-by-round detail**.
- **FR-13 — Player stats (secondary).** Per-user aggregates: games played, wins, win rate, average
  score, best single round. (Candidate for a later unit.)

### Localisation
- **FR-14 — EN + NL.** UI and the rules page available in English and Dutch (matches your other apps).

---

## Non-Functional Requirements

- **NFR-1 — Auth model.** Backend validates login-api JWTs locally against cached JWKS (no per-request
  call to login-api); identity from `sub`; audience/issuer verified per the platform's integration guide.
  Reuses `react-login` on the frontend and the platform's JWKS on the backend (like Aangifte Portal).
- **NFR-2 — Tech stack (two clients, one backend).**
  - **Web** (`ligretto-web`): React 19 + TypeScript + Vite + MUI, embedded `@lars-kluijtmans/react-login`.
  - **Mobile** (`ligretto-mobile`): React Native + Expo (mirrors the platform's `management-mobile`),
    auth via `@lars-kluijtmans/react-auth` mobile PKCE, branding-aware theming.
  - **Backend** (`ligretto-api`, shared by both): FastAPI + SQLAlchemy, Controllers → Services →
    Repositories (mirrors the platform services). DB: SQLite (dev) / MySQL (prod).
  - Both clients consume the SAME `/api/v1` contract; the scoring engine + isolation are server-side so
    the clients stay thin and always agree.
- **NFR-3 — Data isolation (default-deny).** Every query is scoped to the caller: a user sees only games
  they host or are a linked player in. Enforced in repositories (row-level), never trusting client input
  for ownership.
- **NFR-4 — Mobile-first.** Scorekeeping happens on a phone at the table — large tap targets, fast round
  entry, works one-handed. Responsive layout.
- **NFR-5 — Deploy.** Runnable via Docker (frontend nginx + backend uvicorn + DB); can later join the
  home Cloudflare-tunnel stack as its own subdomain.
- **NFR-6 — Branding/theme.** A clean built-in theme to start; optionally pull branding from the platform
  later (like the other apps).
- **NFR-7 — Data integrity.** Scores are server-computed from the stored counts (never trust a client-sent
  total); completed games are immutable.

---

## Open questions / assumptions (please confirm at this checkpoint)

1. **Guest players** — non-host players do **not** need accounts; the host can add plain guest names.
   Linked accounts are optional (needed only for those players' own history/stats). *(Assumed: yes.)*
2. **Target type** — support **both** rounds-based and points-based games; default to a fixed number of
   rounds. *(Assumed: both.)*
3. **Score entry** — default to entering the **two counts** (centre cards + stack remainder) with
   auto-compute, with a direct net-score fallback. *(Assumed: both.)*
4. **Rules content** — a **curated built-in** rules page (no BoardGameGeek/external API). *(Assumed.)*
5. **Player count** — **2–10 players** (confirmed by user).
6. **DB** — standalone **SQLite (dev) / MySQL (prod)**; decide MySQL-reuse-vs-dedicated at construction.
7. **i18n** — EN + NL. *(Assumed.)*

---

## Out of scope (this intent)

- Realtime multi-device play / live sync (each player on their own phone) — deferred; the model is
  one-scorekeeper.
- Simulating actual Ligretto card play.
- Social features (friends, leaderboards across users), push notifications.
- Building any authentication (delegated to the platform).
