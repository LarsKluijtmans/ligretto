"""GET /api/v1/admin/usage — app-wide game-lifecycle counts for app admins.

Reads the platform's feature-usage stream (logs-api, scope `usage:read`) that the game controllers
feed on create/finish/abandon, and returns created / finished / abandoned totals. Gated on the
per-user `admin: true` platform claim (see admin_guard); a non-admin gets 403.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ..admin_guard import current_admin
from ..schemas import AdminUsageOut
from ..security import Principal
from ..services.usage_notifier import read_feature_usage

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

_FEATURES = ("game_created", "game_finished", "game_abandoned")


@router.get("/usage", response_model=AdminUsageOut)
def admin_usage(principal: Principal = Depends(current_admin)) -> AdminUsageOut:
    counts = {f: 0 for f in _FEATURES}
    report = read_feature_usage(principal.project_id) if principal.project_id else None
    if report is None:
        return AdminUsageOut(available=False)
    for total in report.get("totals", []):
        feature = total.get("feature")
        if feature in counts:
            counts[feature] = int(total.get("events") or 0)
    created = counts["game_created"]
    ended = counts["game_finished"] + counts["game_abandoned"]
    return AdminUsageOut(
        created=created,
        finished=counts["game_finished"],
        abandoned=counts["game_abandoned"],
        in_progress=max(0, created - ended),
        available=True,
    )
