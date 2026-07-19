"""Request/response models for the example API."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class Profile(BaseModel):
    """The signed-in user's profile. The first block is read straight from the validated
    access token; the second block is enriched from the auth-api via the M2M admin SDK."""

    # From the token claims:
    sub: str
    email: str | None = None
    username: str | None = None
    project_id: str | None = None
    company_id: str | None = None
    scope: str = ""
    # Enriched from auth-api (only for real end-user tokens, and only when M2M is configured):
    display_name: str | None = None
    language: str | None = None
    profile_picture: str | None = None
    is_active: bool | None = None
    claims: dict[str, Any] = {}
    enriched: bool = False


class LogEventIn(BaseModel):
    """A client-side event the browser asks us to forward into project logging."""

    level: str = "info"
    message: str
    metadata: dict[str, Any] = {}


class Ok(BaseModel):
    ok: bool = True


# --- Profile ---------------------------------------------------------------------

IconType = Literal["none", "emoji", "preset", "image"]

# An uploaded avatar rides inline as a base64 data URL. The client resizes to a small square before
# sending, so this ceiling (~512 KB of image after base64) is only an abuse guard, not the norm.
_MAX_AVATAR_DATA_URL = 700_000


class MeOut(BaseModel):
    sub: str
    display_name: str
    email: str | None = None
    icon_type: IconType = "none"
    icon_value: str | None = None
    avatar_data_url: str | None = None
    language: str | None = None
    is_admin: bool = False  # carries the platform `admin: true` claim → unlocks the Insights tab


class PlayerCard(BaseModel):
    """A searchable player's PUBLIC card — display name + icon + win rate. Email is a search key
    only and is intentionally absent here (never returned to other users)."""

    id: str  # the player's stable public id (platform `sub`), used to invite them (bolt 011)
    display_name: str  # with the email-local-part fallback applied when no display name is set
    icon_type: IconType = "none"
    icon_value: str | None = None
    avatar_data_url: str | None = None
    win_rate: float | None = None  # None when they have no scored completed games
    games_played: int = 0


# --- Invitations (intent 002) ----------------------------------------------------

InvitationStatus = Literal["pending", "accepted", "declined", "cancelled"]


class InviteCreateIn(BaseModel):
    invitee_id: str = Field(min_length=1)  # the searched player's public id (sub)


class InvitationOut(BaseModel):
    """Host's view of an invitation for their game — who was invited + the status."""

    id: int
    status: InvitationStatus
    created_at: datetime
    invitee: PlayerCard


class PendingInviteOut(BaseModel):
    """Invitee's view of a pending invitation — the game + who invited them. No scores."""

    id: int
    game_id: int
    game_name: str | None = None
    inviter: PlayerCard
    created_at: datetime


class ProfileUpdateIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)
    icon_type: IconType = "none"
    icon_value: str | None = Field(default=None, max_length=64)
    avatar_data_url: str | None = None
    language: str | None = Field(default=None, max_length=8)

    @model_validator(mode="after")
    def _check_icon(self) -> "ProfileUpdateIn":
        if self.icon_type in ("emoji", "preset"):
            if not (self.icon_value and self.icon_value.strip()):
                raise ValueError(f"icon_value is required when icon_type is '{self.icon_type}'")
        elif self.icon_type == "image":
            url = self.avatar_data_url
            if not url or not url.startswith("data:image/"):
                raise ValueError("avatar_data_url must be a 'data:image/...' URL when icon_type is 'image'")
            if len(url) > _MAX_AVATAR_DATA_URL:
                raise ValueError("avatar image is too large")
        return self


# --- Games -----------------------------------------------------------------------

TargetType = Literal["endless", "rounds", "points"]
PlayerKind = Literal["account", "guest"]


class NewPlayerIn(BaseModel):
    kind: PlayerKind = "guest"
    display_name: str = Field(min_length=1, max_length=255)


class CreateGameIn(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    # Default is 'endless': keep playing until the host finishes manually (no target). target_value is
    # ignored for endless games and required (> 0) for rounds/points.
    target_type: TargetType = "endless"
    target_value: int = Field(default=0, ge=0)
    players: list[NewPlayerIn]

    @model_validator(mode="after")
    def _check_target(self) -> "CreateGameIn":
        if self.target_type == "endless":
            self.target_value = 0
        elif self.target_value <= 0:
            raise ValueError("target_value must be > 0 for 'rounds' and 'points' games")
        return self


class GameSummary(BaseModel):
    id: int
    name: str | None = None
    status: str
    target_type: str
    target_value: int
    player_count: int
    current_round: int
    leader_name: str | None = None
    host_name: str | None = None   # who created/keeps score for this game
    created_at: datetime


class ScoreEntryIn(BaseModel):
    game_player_id: int
    centre_cards: int | None = None
    stack_left: int | None = None
    net: int | None = None


class RoundScoresIn(BaseModel):
    scores: list[ScoreEntryIn]


class GamePlayerOut(BaseModel):
    id: int
    seat: int
    kind: str
    display_name: str
    total: int


class RoundScoreOut(BaseModel):
    game_player_id: int
    centre_cards: int
    stack_left: int
    computed_score: int


class RoundOut(BaseModel):
    number: int
    scores: list[RoundScoreOut]


class GameDetail(BaseModel):
    id: int
    name: str | None = None
    status: str
    target_type: str
    target_value: int
    created_at: datetime
    completed_at: datetime | None = None
    players: list[GamePlayerOut]
    rounds: list[RoundOut]
    leader: list[int] = []       # game_player_ids sharing the top total
    leader_name: str | None = None
    host_name: str | None = None # who created/keeps score for this game
    winner: int | None = None    # game_player_id of the winner, when completed
    game_over: bool = False
    is_host: bool = False        # is the CALLER the host? (only the host may score/finish/invite)


class StatsOut(BaseModel):
    games_played: int
    wins: int
    win_rate: float
    avg_score: float
    best_round: int


class AdminUsageOut(BaseModel):
    """App-wide game-lifecycle counts, read back from the platform's feature-usage stream.
    `available` is False when the counts couldn't be read (usage not granted / logs-api down)."""

    created: int = 0
    finished: int = 0
    abandoned: int = 0
    in_progress: int = 0  # created - (finished + abandoned), clamped at 0
    available: bool = False
