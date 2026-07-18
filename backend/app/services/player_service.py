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

    def update_profile(self, principal: Principal, display_name: str) -> Player:
        player = self.provision(principal)
        player.display_name = display_name
        self.players.save()
        return player
