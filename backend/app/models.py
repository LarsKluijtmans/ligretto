"""SQLAlchemy models for the Ligretto scorekeeper.

Five tables per the shared contract:
  player        — one row per platform user (keyed by the token `sub`)
  game          — a scorekeeping session, host-scoped (host_player_id)
  game_player   — a seat in a game; either a linked account or a named guest
  round         — a numbered round within a game
  round_score   — one player's score for one round (server-computed)
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Player(Base):
    __tablename__ = "player"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sub: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Profile icon. One of {"none","emoji","preset","image"}:
    #   emoji  -> icon_value holds the emoji character (e.g. "🦊")
    #   preset -> icon_value holds a bundled-avatar id (e.g. "aurora")
    #   image  -> avatar_data_url holds a client-resized `data:image/*;base64,...` URL
    # server_default keeps the ALTER that adds this column to the existing MySQL table valid for the
    # rows already there (see database._reconcile_player_columns).
    icon_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default="none", server_default="none"
    )
    icon_value: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Uploaded avatars are stored inline as a small (client-capped) data URL. MEDIUMTEXT on MySQL so a
    # photo comfortably fits; deferred so this blob is NOT loaded on ordinary player reads (game
    # standings etc.) — only when the profile endpoint serializes it.
    avatar_data_url: Mapped[str | None] = mapped_column(
        Text().with_variant(MEDIUMTEXT(), "mysql"), nullable=True, deferred=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)


class Game(Base):
    __tablename__ = "game"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    host_player_id: Mapped[int] = mapped_column(
        ForeignKey("player.id"), index=True, nullable=False
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_type: Mapped[str] = mapped_column(String(16), nullable=False)  # 'rounds' | 'points'
    target_value: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="active"
    )  # 'active' | 'completed' | 'abandoned'
    winner_game_player_id: Mapped[int | None] = mapped_column(
        ForeignKey("game_player.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    players: Mapped[list["GamePlayer"]] = relationship(
        "GamePlayer",
        back_populates="game",
        cascade="all, delete-orphan",
        foreign_keys="GamePlayer.game_id",
        order_by="GamePlayer.seat",
    )
    rounds: Mapped[list["Round"]] = relationship(
        "Round",
        back_populates="game",
        cascade="all, delete-orphan",
        order_by="Round.number",
    )


class GamePlayer(Base):
    __tablename__ = "game_player"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("game.id"), index=True, nullable=False)
    seat: Mapped[int] = mapped_column(Integer, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # 'account' | 'guest'
    player_id: Mapped[int | None] = mapped_column(ForeignKey("player.id"), nullable=True)
    guest_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)

    game: Mapped["Game"] = relationship(
        "Game", back_populates="players", foreign_keys=[game_id]
    )
    scores: Mapped[list["RoundScore"]] = relationship(
        "RoundScore", back_populates="game_player", cascade="all, delete-orphan"
    )


class Round(Base):
    __tablename__ = "round"
    __table_args__ = (UniqueConstraint("game_id", "number", name="uq_round_game_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("game.id"), index=True, nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)

    game: Mapped["Game"] = relationship("Game", back_populates="rounds")
    scores: Mapped[list["RoundScore"]] = relationship(
        "RoundScore",
        back_populates="round",
        cascade="all, delete-orphan",
    )


class RoundScore(Base):
    __tablename__ = "round_score"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("round.id"), index=True, nullable=False)
    game_player_id: Mapped[int] = mapped_column(
        ForeignKey("game_player.id"), index=True, nullable=False
    )
    centre_cards: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stack_left: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    computed_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    round: Mapped["Round"] = relationship("Round", back_populates="scores")
    game_player: Mapped["GamePlayer"] = relationship("GamePlayer", back_populates="scores")
