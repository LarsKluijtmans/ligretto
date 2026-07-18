"""Request/response models for the example API."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


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

class MeOut(BaseModel):
    sub: str
    display_name: str
    email: str | None = None


class ProfileUpdateIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)


# --- Games -----------------------------------------------------------------------

TargetType = Literal["rounds", "points"]
PlayerKind = Literal["account", "guest"]


class NewPlayerIn(BaseModel):
    kind: PlayerKind = "guest"
    display_name: str = Field(min_length=1, max_length=255)


class CreateGameIn(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    target_type: TargetType
    target_value: int = Field(gt=0)
    players: list[NewPlayerIn]


class GameSummary(BaseModel):
    id: int
    name: str | None = None
    status: str
    target_type: str
    target_value: int
    player_count: int
    current_round: int
    leader_name: str | None = None
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
    winner: int | None = None    # game_player_id of the winner, when completed
    game_over: bool = False


class StatsOut(BaseModel):
    games_played: int
    wins: int
    win_rate: float
    avg_score: float
    best_round: int
