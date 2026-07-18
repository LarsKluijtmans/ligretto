# System Context — 001-ligretto-scorekeeper

**Generated:** 2026-07-18T17:41:43Z

## Context diagram

```mermaid
flowchart TB
  subgraph external[External — the auth platform (../auth), unchanged]
    LW[login-web — hosted login portal]
    LA[login-api — OAuth2/PKCE, JWKS]
  end

  U([Player / Host<br/>browser, mobile-first])

  subgraph app[Ligretto Scorekeeper — THIS project]
    FE[ligretto-web<br/>React + Vite + MUI + react-login]
    BE[ligretto-api<br/>FastAPI + SQLAlchemy]
    DB[(ligretto DB<br/>SQLite dev / MySQL prod)]
  end

  U -->|1. sign in| FE
  FE -->|2. PKCE redirect| LW
  LW --> LA
  LA -->|3. JWT access token| FE
  FE -->|4. Bearer JWT on every call| BE
  BE -->|5. validate JWT locally vs cached JWKS| LA
  BE --> DB
```

## Boundaries

- **In scope (built here):** `ligretto-web` (frontend) + `ligretto-api` (backend) + the app database.
  The app owns all game/player/score data.
- **Reused, not modified:** the auth platform. login-api issues + signs JWTs and serves JWKS; react-login
  runs the PKCE login flow in the frontend. This app is a **resource server** that validates those JWTs.
- **Identity contract:** the JWT `sub` is the stable user id. The app keeps a `player` row per `sub`
  (its own projection), never the platform's user table. No passwords, sessions, or password-reset here.

## External dependencies

| System | Role | Interface |
|---|---|---|
| login-api (`../auth/login-api`) | Token issuer + JWKS | Frontend does PKCE via react-login; backend fetches/caches JWKS to validate access tokens (issuer + audience + exp + RS256). |
| login-web (`../auth/login-web`) | Hosted login UI | Redirect target of the PKCE flow (or embedded `<LoginForm>` from react-login). |
| `@lars-kluijtmans/react-login` | Embedded login component/hooks | npm (or `file:` to `../auth/packages/react/react-login` in dev, like app-starter). |

## Internal components

- **ligretto-web** — routes: `/` (dashboard: my games + new game), `/rules`, `/games/:id` (scoreboard +
  round entry), `/games/:id/history`, `/history`, `/stats`, `/profile`. Mobile-first MUI. i18n EN+NL.
- **ligretto-api** — `/api/v1` under Controllers → Services → Repositories → SQLAlchemy. A JWKS-validation
  dependency yields the caller identity; a `player` is provisioned on first authenticated request.
  Scoring is **server-side** (never trusts a client-sent total). Every query is scoped to the caller.
- **ligretto DB** — `player`, `game`, `game_player`, `round`, `round_score` (see units 003/004).

## Cross-cutting

- **AuthN/Z:** JWT-only; a request with no/invalid token → 401. Ownership: only a game's host (and linked
  player accounts) may read it; only the host may mutate it → else 404 (not 403, to avoid id probing).
- **i18n:** EN + NL, including the rules content.
- **Deploy:** two images (nginx static frontend + uvicorn backend) + a DB; can later attach to the home
  Cloudflare-tunnel stack as `ligretto.<domain>` / `ligretto-api.<domain>`.
