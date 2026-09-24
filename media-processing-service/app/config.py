from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variables de entorno del servicio. Los valores reales nunca se
    comitean; solo .env.example se versiona en el repositorio."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 3004
    database_url: str
    rabbitmq_url: str
    # Deben coincidir con lo que escucha Catalog-Service
    # (catalog-service/src/rabbitmq/media-events.consumer.ts).
    rabbitmq_exchange: str = "media.events"
    media_ready_routing_key: str = "media.ready"
    media_failed_routing_key: str = "media.processing.failed"
    object_storage_bucket: str = "mediastream-media"
    object_storage_endpoint: str = ""
    object_storage_access_key: str = ""
    object_storage_secret_key: str = ""
    cdn_base_url: str = "https://cdn.mediastream.example.com"
    work_dir: str = "/tmp/media-processing"
    node_env: str = "development"
    cors_origins: str = "*"


@lru_cache
def get_settings() -> Settings:
    return Settings()
