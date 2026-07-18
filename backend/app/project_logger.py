"""Ship application-log events into the project's centralized logging (logs-api), via the M2M
admin SDK (`client.logs.write`). Best-effort: a logging hiccup must never break the request it
describes, so every failure is swallowed."""
from __future__ import annotations

from typing import Any

from .admin import get_admin
from .config import settings

_LEVELS = ("debug", "info", "warning", "error", "critical")


def log_event(
    level: str,
    message: str,
    *,
    project_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> bool:
    """Write one event to logs-api. Returns True if it was accepted, False otherwise."""
    if not settings.enable_project_logging:
        return False
    event: dict[str, Any] = {
        "level": level if level in _LEVELS else "info",
        "category": settings.log_category,
        "message": message,
        "metadata": metadata or {},
    }
    if project_id:
        event["project_id"] = project_id
    try:
        get_admin().logs.write([event])
        return True
    except Exception:
        # Swallow: never let the logging backend surface an error to the user.
        return False
