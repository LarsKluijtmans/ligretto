# Bolt 007 — mobile-foundation

- **Intent:** 001-ligretto-scorekeeper · **Unit:** 006 mobile-app · **Status:** planned
- **Created:** 2026-07-18T17:41:43Z
- **Depends on:** 001 app-foundation (API + auth), 003/004 (API to consume)

## Goal
Stand up the native mobile client (React Native + Expo, mirroring `management-mobile`) with platform auth.

## Stories
S-006-1 mobile scaffold + auth + shell.

## Key deliverables
- Expo/React Native app (`ligretto-mobile`); platform mobile PKCE sign-in via `react-auth`; secure token
  storage + refresh; protected navigation; EN/NL i18n; branding-aware theme (`useColors()` pattern).
- Consumes the existing `ligretto-api` (`GET /api/v1/me` etc.).

## Definition of Done
Sign in on a device/emulator lands authenticated; `/api/v1/me` works from the app; language switch works;
no backend changes required.
