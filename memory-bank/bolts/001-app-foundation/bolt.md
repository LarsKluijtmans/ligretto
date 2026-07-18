# Bolt 001 — app-foundation

- **Intent:** 001-ligretto-scorekeeper · **Unit:** 001 app-foundation · **Status:** planned
- **Created:** 2026-07-18T17:41:43Z
- **Depends on:** — (first bolt)

## Goal
Stand up both tiers, wire platform auth, provision players, and ship the app shell. Everything else
builds on this.

## Stories
S-001-1 scaffold two tiers · S-001-2 embedded react-login PKCE · S-001-3 backend JWKS validation + `/me`
· S-001-4 player provisioning + profile · S-001-5 app shell + i18n (EN/NL) + theme.

## Key deliverables
- `ligretto-web` (React 19+TS+Vite+MUI) + `ligretto-api` (FastAPI+SQLAlchemy, Controllers→Services→Repos).
- Embedded `@lars-kluijtmans/react-login` (dev via `file:../auth/packages/react/react-login`).
- JWKS-cached JWT validation dependency; `player` model + first-login provisioning; `GET/PATCH /me/profile`.
- Dockerfiles + compose; `.env.example`; one-command dev run.

## Definition of Done
`docker compose up` serves the shell; sign-in via the platform round-trips to authenticated; `/api/v1/me`
returns identity (401 without a valid token); first authenticated call creates exactly one player; EN/NL
switch works; backend unit tests green (SQLite).
