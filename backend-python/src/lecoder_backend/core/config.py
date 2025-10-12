"""
Application configuration using pydantic-settings
"""
import os
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Supabase Configuration
    supabase_url: str
    supabase_service_key: str

    # AI Model API Keys
    anthropic_api_key: str | None = None
    google_api_key: str | None = None

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    environment: str = "development"

    # CORS Configuration
    allowed_origins: str = "http://localhost:3000"

    # Job Configuration
    max_processing_time: int = 3600  # 1 hour in seconds
    file_retention_days: int = 7

    # Application Info
    app_name: str = "LeCodeR Backend"
    app_version: str = "1.0.0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated origins into a list"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


# Global settings instance
settings = Settings()
