"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings, PydanticBaseSettingsSource


MIN_JWT_SECRET_BYTES = 32

# Historical values published by this repository, plus common deployment
# placeholders. Length alone cannot reject every one of these.
_PUBLIC_JWT_SECRET_PLACEHOLDERS = frozenset({
    "change-me-in-production",
    "change-this-to-a-random-256-bit-hex-string",
    "replace-me-with-a-secure-random-secret",
    "your-secret-key-change-in-production",
})


class InvalidRuntimeConfiguration(RuntimeError):
    """Raised when security-sensitive runtime configuration is unsafe."""


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://pokerin:pokerin@localhost:5432/pokerin"

    # EVE SSO
    eve_client_id: str = ""
    eve_callback_url: str = "http://localhost:8080/auth/callback"
    eve_scopes: str = "publicData"
    eve_sso_base: str = "https://login.eveonline.com"

    # Bank character (deposit detection)
    bank_character_id: int = 0
    bank_refresh_token: str = ""
    bank_client_id: str = ""  # separate SSO app for bank auth

    # App JWT
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    # Server
    host: str = "0.0.0.0"
    port: int = 8080
    debug: bool = False
    base_url: str = "http://localhost:8080"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        # Redis was removed in 2026. Existing private dotenv files may still
        # carry this one retired key; ignore only it while retaining Pydantic's
        # fail-closed behavior for every other unknown dotenv key.
        env_vars = getattr(dotenv_settings, "env_vars", None)
        if isinstance(env_vars, dict):
            env_vars.pop("redis_url", None)
        return init_settings, env_settings, dotenv_settings, file_secret_settings


def validate_jwt_secret(secret: str) -> None:
    """Reject published placeholders and JWT keys shorter than 256 bits.

    Validation is deliberately explicit at application startup rather than at
    Settings construction time. This keeps package imports, Alembic, and other
    tooling usable without weakening the server startup boundary.
    """
    if not isinstance(secret, str):
        raise InvalidRuntimeConfiguration("JWT_SECRET must be a string")

    normalized = secret.strip().casefold()
    if not normalized:
        raise InvalidRuntimeConfiguration("JWT_SECRET must not be blank")
    if normalized in _PUBLIC_JWT_SECRET_PLACEHOLDERS:
        raise InvalidRuntimeConfiguration(
            "JWT_SECRET is a known public placeholder; generate a unique secret"
        )

    try:
        secret_bytes = secret.encode("utf-8")
    except UnicodeEncodeError as exc:
        raise InvalidRuntimeConfiguration("JWT_SECRET must be valid UTF-8") from exc
    if len(secret_bytes) < MIN_JWT_SECRET_BYTES:
        raise InvalidRuntimeConfiguration(
            f"JWT_SECRET must contain at least {MIN_JWT_SECRET_BYTES} UTF-8 bytes"
        )


def validate_runtime_settings(runtime_settings: Settings) -> None:
    """Validate security invariants required to start application services."""
    validate_jwt_secret(runtime_settings.jwt_secret)


settings = Settings()
