"""Player directory — search existing Ligretto players and build their PUBLIC card (display name +
icon + win rate). Email is a **search key only** and never leaves this layer."""
from __future__ import annotations

from ..models import Player
from ..repositories.player import PlayerRepository
from ..schemas import PlayerCard
from ..services.stats_service import StatsService

# Search guards (NFR-1 privacy / NFR-5 bounded): require a real query, never return an unbounded list.
MIN_QUERY_LEN = 2
MAX_RESULTS = 10


def display_name_for(player: Player) -> str:
    """The name to SHOW for a player. When no real display name is set, fall back to the email
    local-part (the bit before `@`) per the intent; the raw email is never shown."""
    name = (player.display_name or "").strip()
    if name and "@" not in name:
        return name
    # No display name, or it's just the email echoed back at provisioning → use the local-part.
    email = (player.email or "").strip()
    if "@" in email:
        return email.split("@", 1)[0]
    return name or "Player"


def to_player_card(player: Player, stats: StatsService) -> PlayerCard:
    """Build a player's PUBLIC card (name + icon + win rate; never email). Shared by search and the
    invitation views so every surface shows the same thing."""
    played, _wins, win_rate = stats.win_rate_for(player.id)
    return PlayerCard(
        id=player.sub,
        display_name=display_name_for(player),
        icon_type=player.icon_type,
        icon_value=player.icon_value,
        avatar_data_url=player.avatar_data_url,
        win_rate=win_rate,
        games_played=played,
    )


class PlayerDirectoryService:
    def __init__(self, players: PlayerRepository, stats: StatsService) -> None:
        self.players = players
        self.stats = stats

    def search(self, query: str) -> list[PlayerCard]:
        q = (query or "").strip()
        if len(q) < MIN_QUERY_LEN:
            return []
        return [to_player_card(p, self.stats) for p in self.players.search(q, MAX_RESULTS)]
