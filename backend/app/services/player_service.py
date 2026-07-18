"""Player provisioning + profile.

The platform owns identity; we mirror a lightweight `player` row keyed by the token `sub`
so games can reference a local player id. `provision` is idempotent — call it on every
authenticated request that needs a local player.
"""
from __future__ import annotations

from ..models import Player
from ..repositories.player import PlayerRepository
from ..security import Principal


class PlayerService:
    def __init__(self, players: PlayerRepository) -> None:
        self.players = players

    def provision(self, principal: Principal) -> Player:
        """Return the caller's player row, creating it on first sight."""
        player = self.players.get_by_sub(principal.sub)
        if player is None:
            display = principal.username or principal.email or principal.sub
            player = self.players.create(
                sub=principal.sub, display_name=display, email=principal.email
            )
            self.players.save()
        return player

    def set_display_name(self, principal: Principal, display_name: str) -> Player:
        """Name-only update — used by the auth-api enrichment on first sight."""
        player = self.provision(principal)
        player.display_name = display_name
        self.players.save()
        return player

    def update_profile(
        self,
        principal: Principal,
        *,
        display_name: str,
        icon_type: str,
        icon_value: str | None,
        avatar_data_url: str | None,
        language: str | None,
    ) -> Player:
        """Full profile update from the profile page: display name + icon (emoji / preset / image)
        + preferred language.

        The icon fields are normalised so exactly one representation is stored — switching to an
        emoji/preset clears any uploaded image, and vice versa — so a stale blob never lingers.
        """
        player = self.provision(principal)
        player.display_name = display_name
        player.icon_type = icon_type
        player.icon_value = icon_value if icon_type in ("emoji", "preset") else None
        player.avatar_data_url = avatar_data_url if icon_type == "image" else None
        player.language = language or None
        self.players.save()
        return player
