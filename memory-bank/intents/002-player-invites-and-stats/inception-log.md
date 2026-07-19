# Inception Log — 002-player-invites-and-stats

- **2026-07-18T23:18:46Z** — Intent created. Checkpoint 1 clarifying questions answered:
  - **Discovery scope:** Ligretto players only (search the app's own player table by name/email; no
    wider platform directory; no email-invite for non-users).
  - **Invite model:** accept-required (pending until the invitee accepts; only then do they join and
    their stats count).
  - **New players:** existing Ligretto users only (no stub/placeholder players, no merge-on-first-login).
  - Defaults confirmed: player card shows name + icon + win rate (email never shown); missing display
    name falls back to the email local-part; ad-hoc guests remain supported.
- **2026-07-18T23:18:46Z** — `requirements.md` generated (13 FR, 5 NFR, 6 open questions). **Checkpoint 2
  APPROVED** by user (no changes).
- **2026-07-18T23:18:46Z** — Auto-continued: generated `system-context.md` (delta over intent 001),
  `units.md` (**3 units, 9 stories**), story-index rows, and **4 bolt stubs** (`bolts/010-player-directory`,
  `011-game-invitations-api`, `012-game-invitations-web`, `013-mobile-invites-and-stats`). Unit 009 (mobile)
  is optional parity.
- **2026-07-18T23:18:46Z** — **Checkpoint 3 APPROVED** by user (no changes: mobile kept, 011/012 split kept).
  **Checkpoint 4 — inception COMPLETE.** Handoff to Construction Agent; first bolt = **010 player-directory**.
  (Note: `.specsmd/aidlc/scripts/artifact-validator.cjs` could not run in this checkout — missing `fs-extra`
  dep; artifacts hand-validated against intent 001's format.)
- **2026-07-18T23:18:46Z** — Construction: **bolt 010 backend slice built + tested** (player search API,
  tie-aware win rate, email-prefix display-name fallback; 37 backend tests pass). Web UI + deploy pending.
- **2026-07-18T23:18:46Z** — **REPLAN (new requirement, mid-construction):** user wants **real-time**
  invite notifications. Delivery chosen: **live in-app (SSE) + away push/email** (notification-api).
  Requirements updated (FR-12 → live SSE; **new FR-14** away push/email; new NFR-6 real-time mechanism +
  NFR-7 best-effort). Added **Unit 010 realtime-invite-notifications** (S-010-1/2/3) + **bolts 014
  (backend SSE + push/email) & 015 (web live toast/badge)**. Intent 002 now **4 units · 12 stories · 6
  bolts** (010–015; 013 mobile optional). Bolt 010 unaffected — resuming its web UI next.
