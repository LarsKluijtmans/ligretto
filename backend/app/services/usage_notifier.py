"""Feature-usage metering to the platform logs-api (`POST /logs/v1/usage/features`, scope
`usage:write`). We emit named business events — `game_created` / `game_finished` /
`game_abandoned` — so the app owner can see how many games are made and how they end.

This is SEPARATE from application logging (project_logger, which carries errors/warnings): usage
events land in the platform's `feature_usage_events` stream, queryable per project.

BEST-EFFORT and NON-BLOCKING: a metering hiccup (network, missing scope, no M2M creds) must never
affect the game flow, so every failure is swallowed. The counts are read back for the in-app
insights view via `read_feature_usage` (scope `usage:read`).
"""
from __future__ import annotations

from typing import Any

from ..admin import get_admin
from ..config import settings

_WRITE_PATH = "/logs/v1/usage/features"


def record_usage(
    feature: str,
    *,
    subject: str | None = None,
    project_id: str | None = None,
    quantity: int = 1,
    metadata: dict[str, Any] | None = None,
) -> bool:
    """Record one feature-usage event. Returns True if accepted, False on any failure."""
    if not settings.enable_usage_events:
        return False
    event: dict[str, Any] = {"feature": feature, "quantity": quantity, "metadata": metadata or {}}
    if subject:
        event["subject"] = subject
    if project_id:
        event["project_id"] = project_id
    try:
        # The admin client already holds the M2M token and the logs-api base URL; `service="logs"`
        # routes there and refreshes the token on a 401.
        get_admin().request("POST", _WRITE_PATH, service="logs", json={"events": [event]})
        return True
    except Exception:
        # Never let a metering concern surface to the caller.
        return False


def read_feature_usage(
    project_id: str, *, start: str | None = None, end: str | None = None
) -> dict[str, Any] | None:
    """Read this project's feature-usage totals (scope `usage:read`), grouped by feature. Returns the
    logs-api FeatureUsageReport, or None if the read fails / usage is unavailable."""
    params: dict[str, Any] = {"group_by": "feature"}
    if start:
        params["from"] = start
    if end:
        params["to"] = end
    try:
        return get_admin().request(
            "GET", f"/logs/v1/projects/{project_id}/usage/features", service="logs", params=params
        )
    except Exception:
        return None
