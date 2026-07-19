"""Gate app-admin surfaces on a per-user platform claim `admin: true`.

The claim lives on the platform (set via the console / auth-api user claims). We read it with the
M2M admin SDK (`users.get_claims`, scope `users:read`) — the browser can't be trusted to assert its
own privilege. Fail-closed: any error (no M2M creds, network, missing claim) means NOT admin.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status

from .config import settings
from .security import Principal, verify_token


def is_admin(principal: Principal) -> bool:
    """True only if this end-user carries the `admin: true` claim on the platform."""
    if not (settings.enable_enrichment and principal.is_user and principal.project_id):
        return False
    try:
        from .admin import get_admin

        claims = get_admin().users.get_claims(principal.project_id, principal.sub)
        return claims.get("admin") is True
    except Exception:
        return False


def current_admin(principal: Principal = Depends(verify_token)) -> Principal:
    """FastAPI dependency: 403 unless the caller has the `admin` claim."""
    if not is_admin(principal):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin only")
    return principal
