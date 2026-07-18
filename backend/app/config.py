"""Backend configuration. Everything comes from the environment (a `.env` file in dev) — no
secrets or URLs are hard-coded. See `.env.example`."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App identity + database ------------------------------------------------
    app_name: str = "ligretto"
    # App database (games / players / scores / history). SQLite for dev; MySQL for
    # prod, e.g. mysql+pymysql://user:pass@host:3306/ligretto
    database_url: str = "sqlite:///./ligretto.db"

    # --- Platform service URLs (point these at your deployment) ------------------
    # Login API: serves JWKS, branding, the login UI config, and runs the M2M
    # client_credentials grant.
    login_api_url: str = "http://127.0.0.1:8010"
    # auth-api (/auth/v1): the auth-domain admin surface the admin SDK reads users from.
    auth_api_url: str = "http://127.0.0.1:8050"
    # logs-api (/logs/v1): the project's centralized logging.
    logs_api_url: str = "http://127.0.0.1:8030"

    # The `iss` the Login API stamps on tokens — MUST equal its TOKEN_ISSUER. We pin
    # `iss` during verification, so a mismatch here rejects every token.
    token_issuer: str = "http://127.0.0.1:8010"

    # --- M2M service account (server-side ONLY — never shipped to the browser) ---
    # A client_credentials client whose RBAC role grants `users:read` (profile
    # enrichment) and `logs:write` (project logging).
    m2m_client_id: str = ""
    m2m_client_secret: str = ""

    # --- Behaviour toggles ------------------------------------------------------
    enable_enrichment: bool = True          # call auth-api to enrich the profile
    enable_project_logging: bool = True     # ship events to logs-api
    log_category: str = "app-starter"       # category stamped on every log event
    jwks_cache_seconds: int = 300           # honor the JWKS Cache-Control max-age

    # Comma-separated browser origins allowed to call this API (CORS).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
