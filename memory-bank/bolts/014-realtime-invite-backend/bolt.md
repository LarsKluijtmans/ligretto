# Bolt 014 — realtime-invite-backend

- **Intent:** 002-player-invites-and-stats · **Unit:** 010 realtime-invite-notifications · **Status:** planned
- **Created:** 2026-07-18T23:18:46Z
- **Depends on:** 011 game-invitations-api

## Goal
Deliver an invite the instant it's sent: a live SSE event stream + an away email/mobile-push.

## Stories
S-010-1 backend event stream + publish on invite (SSE) · S-010-3 away push + email (notification-api).

## Key deliverables
- `GET /api/v1/events` — authenticated **SSE** endpoint over an **in-process** per-user pub/sub; a user
  only receives their OWN events. `InvitationService.invite()` publishes `invitation.created`
  (game name + inviter name + fresh pending count) to the invitee's channel.
- Best-effort, **non-blocking** away notification on invite (after commit): a platform **email** (new
  EN+NL "you've been invited" template + send key) and an **Expo mobile push** via `notification-api`.
  Failures are logged + swallowed (ADR-036), never raised into the invite.

## Definition of Done
A connected invitee receives the event within ~1s; another user never does; the stream needs a valid
token and its loss never affects the authoritative pending list; inviting fires exactly one email + push
attempt and a notification-api outage does NOT fail the invite.
