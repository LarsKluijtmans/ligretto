"""Away notification for invitations (intent 002, FR-14) — email + mobile push for when the invitee is
NOT online (the SSE stream covers the online case). BEST-EFFORT and NON-BLOCKING (ADR-036): nothing here
may ever affect the invite flow.

STATUS: the extension point is wired (called after every invite, failure-swallowed) but actual delivery
needs the platform notification-api connected to THIS backend — a NOTIFICATION_API_URL, an M2M token with
`notifications:send`, and a 'you've been invited' template (EN+NL) in the catalog. Until that's
provisioned this records the intent via project logging; drop the send call in where noted.
"""
from __future__ import annotations

from ..models import Game, Player
from ..project_logger import log_event


def notify_invited_away(inviter: Player | None, invitee: Player, game: Game) -> None:
    try:
        log_event(
            "info",
            "invitation.notify_away",
            metadata={
                "invitee_id": str(invitee.id),
                "game_id": game.id,
                "has_email": bool(invitee.email),
                # --- extension point ---
                # When notification-api is wired: send template "you_were_invited" (EN/NL) to
                # invitee.email + an Expo push, with context {inviter, game_name}. Keep it best-effort.
            },
        )
    except Exception:
        pass  # a notification concern must never touch the invite
