"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://pokerin:pokerin@localhost:5432/pokerin"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

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
    jwt_secret: str = "CHANGE-ME-IN-PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    # Server
    host: str = "0.0.0.0"
    port: int = 8080
    debug: bool = False
    base_url: str = "http://localhost:8080"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
