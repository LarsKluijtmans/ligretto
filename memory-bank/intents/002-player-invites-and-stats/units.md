# Units — 002-player-invites-and-stats

**Generated:** 2026-07-18T23:18:46Z

Four vertical units continuing the project's global unit sequence (001 used 001–006). **007** builds the
player directory + cross-user win-rate (the read side the card needs); **008** adds the accept-required
invitation flow + consent-safe stats/history; **010** adds **real-time** invite delivery (live in-app SSE
+ away push/email); **009** is optional **mobile parity**. Dependency order: **007 → 008 → 010**, then
**009** (needs the 007/008/010 API). Bolts continue the global sequence at **010** (bolt ids).

| Unit | Name | Client | Delivers (FR) | Depends on |
|---|---|---|---|---|
| 007 | player-directory-and-stats | web + api | FR-1, FR-2, FR-3, FR-9, FR-13 | 001 (players), 001-u005 (stats) |
| 008 | game-invitations | web + api | FR-4, FR-5, FR-6, FR-7, FR-8, FR-10, FR-11, FR-13 | 007, 001-u003 (games) |
| 010 | realtime-invite-notifications | web + api | FR-12, FR-14, FR-13 | 008, notification-api |
| 009 | mobile-invites-and-stats *(optional parity)* | mobile | FR-1–FR-14 (native) | 007, 008, 010 (API) |

---

## Unit 007 — player-directory-and-stats
The read side: find existing Ligretto players and show a privacy-safe card (name + icon + win rate).

- **S-007-1 — Player search API.** `GET /api/v1/players/search?q=` searches THIS app's players by
  **display name OR email** (min 2 chars, cap ~10), Ligretto players only. Returns each player's public id,
  display name (with **email-local-part fallback** when blank), icon, and win rate — **never the email**.
  *AC:* `q` < 2 chars → empty/400; a match by email still returns the player but the response contains no
  email; results capped; caller-agnostic (any signed-in user may search).
- **S-007-2 — Win-rate + public player stats.** Extend the stats service: a player's **win rate** =
  wins ÷ completed games they were a linked account-player in (host included); a **tied top score counts
  as a win**. Expose the minimal player-stat the card needs. *AC:* win rate matches the underlying games;
  ties count as wins; 0 games → null/0 (no divide-by-zero); computation is server-side + bounded.
- **S-007-3 — Player card + search UI (web).** A reusable **PlayerCard** (icon + name + win rate) and a
  debounced search box in the add-players step that lists matching players as cards; selecting one stages
  it for invite (wired in unit 008). Email never rendered. EN/NL. *AC:* typing ≥2 chars lists matches as
  cards; no email anywhere; debounced (no request per keystroke).

## Unit 008 — game-invitations
The accept-required invitation flow + consent-safe cross-user stats/history. Domain: `game_invitation`.

- **S-008-1 — Invitation domain + host actions.** `game_invitation` model + migration/reconcile
  (game_id, inviter, invitee, status[pending|accepted|declined|cancelled], timestamps; no duplicate
  pending per invitee/game). `POST /games/:id/invitations` (host invites a searched **existing** player →
  pending), `GET /games/:id/invitations` (host: pending/accepted/declined), `DELETE
  /games/:id/invitations/:iid` (host cancels a pending one). *AC:* duplicate pending rejected; non-host →
  404; cancel only affects a pending invite; invitee must be an existing player.
- **S-008-2 — Invitee accept / decline.** `GET /api/v1/invitations` (my pending invites: inviter +
  game name, **no scores**), `POST /invitations/:iid/accept` (seat me as a `kind='account'` player in the
  game; status→accepted), `POST /invitations/:iid/decline` (status→declined; not seated). *AC:* accept
  seats exactly one account-player and is idempotent-safe (no double accept); a pending invitee cannot read
  the game's scores until accepted; decline never seats.
- **S-008-3 — Consent-safe stats + history wiring.** Accepted players' games appear in **their** history
  (`GET /history`) and their stats/win rate (`GET /stats/me`, and the card from S-007-2) now span games
  they **hosted OR accepted**. Being invited/declining never changes a record. *AC:* after accept + finish,
  the game is in the invitee's history and counts toward their win rate; a pending/declined invite counts
  for nothing; isolation still 404s non-participants.
- **S-008-4 — Invite + pending-invites UI (web).** Game setup: invite a searched player (uses S-007-3) →
  shows as **pending**; the host sees invite statuses and can cancel. App-wide: a **pending-invites badge +
  list** with **accept / decline**; accepting adds the user to the game. EN/NL. *AC:* host invite shows
  pending; invitee sees the badge + list and can accept/decline; accepting seats them; email never shown.

## Unit 010 — realtime-invite-notifications
Deliver an invitation the moment it's sent: a **live in-app** toast/badge (SSE) when the app is open, and
an **away** email + mobile push (notification-api) when it isn't. Depends on the invitation domain (008).

- **S-010-1 — Backend event stream + publish on invite (SSE).** An authenticated `GET
  /api/v1/events` SSE endpoint backed by an **in-process** per-user pub/sub; `InvitationService`
  publishes an `invitation.created` event (game name + inviter display name + fresh pending count) to the
  invitee's channel when an invite is sent. Scoped so a user only ever receives **their own** events.
  *AC:* a connected invitee receives the event within ~1s of being invited; another user never receives
  it; the stream requires a valid token; dropping the stream never affects the authoritative pending list.
- **S-010-2 — Web live toast + badge.** The web app subscribes to the stream (Bearer via a fetch-stream
  reader — no token-in-URL), shows a **toast** ("{inviter} invited you to a game") and **increments the
  pending-invites badge** with no refresh; reconnects on drop and reconciles the badge from `GET
  /invitations`. EN/NL. *AC:* being invited while the app is open pops a toast + bumps the badge live;
  after a reconnect the badge still matches the pending list.
- **S-010-3 — Away push + email (notification-api).** On invite, **after commit**, best-effort dispatch a
  platform **email** (new "you've been invited" template, EN + NL) and a **mobile push** (Expo) via
  `notification-api`. Fully **non-blocking** — a failure is logged and swallowed, never raised into the
  invite. *AC:* inviting triggers exactly one email + push attempt; a notification-api outage does not fail
  the invite; no email/push when the invitee has no address/device.

## Unit 009 — mobile-invites-and-stats *(optional parity)*
Native mobile parity over the SAME `ligretto-api`. No new backend. Cut this unit if mobile is out of scope
for now.

- **S-009-1 — Mobile search + invite.** Mobile add-players **search** (player cards: icon + name + win
  rate) + **invite**; host sees invite statuses. *AC:* invite a player from a phone; pending shows; email
  never rendered.
- **S-009-2 — Mobile pending-invites + accept/decline.** A pending-invites screen/badge; accept/decline;
  accepting joins the game and the shared stats/history reflect it. *AC:* accept on mobile seats the player;
  their history/stats show the game.

> Cross-cutting: the scoring engine, isolation, and all computation stay server-side (from 001), so the
> web and mobile clients remain thin and always agree. Accepted invitees reuse the existing `game_player`
> `account` seat — no new seat type, no change to scoring.
