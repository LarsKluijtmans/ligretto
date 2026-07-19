# Requirements — 002-player-invites-and-stats

**Intent:** Invite existing Ligretto players to your games (with their consent) and track shared stats —
search players by display name or email, see each one's **display name + icon + win rate** (never their
email), send **accept-required** invitations, and once a player accepts, their scores and win/loss record
are tracked across every game they join.

**Generated:** 2026-07-18T23:18:46Z · **Checkpoint 2 (Requirements Review)**

---

## Direction (from Checkpoint 1)

| Decision | Choice |
|---|---|
| **Discovery scope** | **Ligretto players only** — search the app's OWN player table by display name or email. No wider platform-directory search; no email-invite for people who've never used Ligretto. |
| **Invite model** | **Accept-required** — an invitation is *pending* until the invitee accepts; only then do they join the game and their stats count. |
| **New players** | **Existing users only** — an invitee must have signed into Ligretto at least once. No stub/placeholder players, no merge-on-first-login. |
| **Player card** | Shows **display name + icon + win rate** only. **Email is a search key and is NEVER displayed or returned.** |
| **Display-name fallback** | If a player has no display name, show the **email local-part** (the part before `@`). |
| **Guests** | **Unchanged** — ad-hoc guest names remain supported alongside invited real players. |
| **Real-time invites** | **Live in-app (SSE) + push when away.** While the invitee has Ligretto open, the invite appears instantly (toast + badge, no refresh) via Server-Sent Events; when the app is closed, a platform **email + mobile push** (notification-api / Expo) reaches them. |

---

## Functional Requirements

### Discovery & player identity
- **FR-1 — Search Ligretto players.** When adding players to a game, the host can search **existing
  Ligretto players** by **display name or email** (typed query). Results come from the app's own player
  table only. Email is matched but **never returned** by the API.
- **FR-2 — Player card.** Search results and seated real players show **display name + icon + win rate**
  only — never the email.
- **FR-3 — Display-name fallback.** When a player has no display name set, present the **email
  local-part** (before `@`) as their display name, everywhere they appear (search results, seats, cards).

### Invitations (accept-required)
- **FR-4 — Invite a player to a game.** From game setup, the host invites a found player. This creates a
  **pending invitation** — the player is *not* seated yet. A player cannot have two pending invites to the
  same game.
- **FR-5 — See my invitations.** An invited user sees their **pending game invitations** (a list, and an
  unobtrusive badge/count): who invited them and which game.
- **FR-6 — Accept / decline.** The invitee **accepts** → they become a **seated linked account-player** in
  that game and their scores/stats count; or **declines** → the invitation is closed and they are not in
  the game. They join **only** after accepting.
- **FR-7 — Consent & integrity.** A player's stats and win/loss record are affected **only** by games they
  **hosted or accepted**. Being invited (or declining) never changes their record.
- **FR-8 — Host manages invitations.** The host can see a game's **pending / accepted / declined**
  invitations and **cancel** a pending one.

### Cross-user stats & history
- **FR-9 — Player win rate.** Server-computed **win rate** (wins ÷ completed games the player was a linked
  account-player in, host included). Shown on the player card during search/invite.
- **FR-10 — Stats for all linked players.** The per-user aggregates from intent 001 (games played, wins,
  win rate, average score, best round) now span **every game a player hosted or accepted**, not just games
  they hosted. (Extends 001 FR-13.)
- **FR-11 — Shared game history.** An accepted player sees the game in **their own** history (they played
  in it), not only the host's. (Extends 001 FR-12.)

### Notifications (real-time)
- **FR-12 — Live in-app invitation (real-time).** While the invitee has Ligretto open, a new invitation
  appears **instantly** — a toast + the pending-invitations badge increments, with **no refresh** —
  pushed over **Server-Sent Events** from the ligretto backend. A missed live event is never lost: the
  invitation still shows in the pending list on next load (the stream is a live convenience over the
  authoritative list).
- **FR-14 — Away notification (push + email).** When invited, the invitee is **also** notified via the
  platform `notification-api`: an **email** and, on the Expo mobile app, a **mobile push**. This reaches
  them when Ligretto is closed. Best-effort and **non-blocking** — a notification failure never blocks
  the invite (ADR-036 pattern).

### Localisation
- **FR-13 — EN + NL.** All new UI (invite dialog, pending-invitations list, player card, invite toast)
  available in English and Dutch.

---

## Non-Functional Requirements

- **NFR-1 — Privacy.** Email is a **search key only** — never returned by the API, never rendered in the
  UI. Search requires a **minimum query length** and returns a **bounded page** (no "list every user"
  enumeration). Only **Ligretto players** are searchable — never the wider platform directory.
- **NFR-2 — Consent / integrity.** No data is written to another user's record without their **acceptance**;
  no stub players are ever created. A game affects a player only once they host or accept it.
- **NFR-3 — Isolation (extends 001 NFR-3).** A user sees a game only if they **host** it or are an
  **accepted** linked player. A pending invitee sees the invitation metadata (host, game name) but **not
  the game's scores** until they accept. Enforced server-side in repositories, never trusting client input.
- **NFR-4 — Patterns / stack.** New `invitation` table + repository/service; the stats service is extended
  to aggregate across accepted games; both web + mobile clients consume the SAME `/api/v1` contract; all
  computation is server-side. Mirrors the existing Controllers → Services → Repositories layering.
- **NFR-5 — Performance.** Search and win-rate are bounded and efficient — debounced queries, capped
  result sets, and aggregate/cached stats rather than a heavy recompute per keystroke.
- **NFR-6 — Real-time mechanism.** The live channel is **SSE** with an **in-process** per-user pub/sub —
  fits the single-instance ligretto backend, no extra infra (Redis/queue). The stream is **authenticated**
  with the Bearer token (a fetch-stream reader, not a token-in-URL `EventSource`), scoped so a user only
  receives **their own** events. The stream is a convenience layer over the authoritative pending list —
  correctness never depends on a delivered event. *(If the backend is ever scaled to multiple instances,
  swap the in-process bus for a shared one — noted, not built.)*
- **NFR-7 — Best-effort delivery.** The away email/push (FR-14) is dispatched **after** the invitation is
  committed and is fully non-blocking — a transport/timeout/non-2xx is logged and swallowed, never raised
  into the invite flow.

---

## Open questions / assumptions (please confirm at this checkpoint)

1. **Invite timing** — invitations can be sent during setup and **until the first round is scored** (mirrors
   001's add/remove-player-before-scoring). Adding an accepted player *mid-game* is **out of scope** here.
   *(Assumed.)*
2. **Win definition** — a **tied top score counts as a win** for each leader (matches 001's shared-leader
   model). *(Assumed — confirm.)*
3. **Notification channel** — **RESOLVED:** real-time **live in-app (SSE)** toast/badge **plus** an away
   **email + mobile push** via `notification-api` (FR-12 + FR-14). A "You've been invited" email template
   + send key must be added to the notification catalog (EN + NL).
4. **Search constraints** — minimum **2 characters**, result cap **~10**. *(Assumed.)*
5. **Decline behaviour** — declining closes **just that invitation** (no blocking / no "don't invite me
   again"). *(Assumed.)*
6. **Discoverability opt-out** — a player cannot yet hide themselves from search. *(Assumed out of scope —
   see below; flag if you want it in.)*

---

## Out of scope (this intent)

- Searching or inviting the **wider platform directory** (people who have never used Ligretto); **stub
  players** + merge-on-first-login.
- **Friends lists**, a persistent social graph, or global cross-user **leaderboards**.
- **Realtime** multi-device play / live sync.
- **Discoverability opt-out** / block lists (candidate for a later intent).
- Any change to authentication (delegated to the platform).
