"""Service-layer exceptions, mapped to HTTP status codes in the controllers."""
from __future__ import annotations


class ServiceError(Exception):
    """Base — carries an HTTP status and a message."""

    status_code = 400

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFound(ServiceError):
    status_code = 404


class BadRequest(ServiceError):
    status_code = 400


class Conflict(ServiceError):
    status_code = 409
