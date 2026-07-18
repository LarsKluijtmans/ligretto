# Ligretto Scorekeeper

A mobile-first web app to look up the **Ligretto** card game + its rules, sign in, host a game, add
players, and keep score round-by-round — with a browsable history of every game played.

- **Auth:** built on the platform (`../auth`) — sign in via hosted **react-login** (PKCE); the JWT `sub`
  is the identity. No auth is implemented here.
- **Clients:** a **website** (`ligretto-web`, React + Vite + MUI) and a **mobile app** (`ligretto-mobile`,
  React Native + Expo) — both over one **backend** (`ligretto-api`, FastAPI + SQLAlchemy,
  Controllers→Services→Repositories). SQLite (dev) / MySQL (prod).
- **Scoring:** `round score = cards played to centre − 2 × cards left in your Ligretto stack`; play to a
  target (rounds or points).
- **Model:** one scorekeeper per game (the host enters each round's scores); 2–10 players; accounts or
  guest names.

## Planning (AI-DLC / specsmd)

This project is planned with the specsmd inception flow. See:
- `memory-bank/intents/001-ligretto-scorekeeper/requirements.md`
- `.../system-context.md` · `.../units.md`
- `memory-bank/story-index.md` · `memory-bank/bolts/`

Status: **inception complete — construction not started.**
