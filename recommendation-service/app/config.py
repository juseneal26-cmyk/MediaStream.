from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variables de entorno del servicio. Los valores reales nunca se
    comitean; solo .env.example se versiona en el repositorio."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 3005
    database_url: str

    # Redis Pub/Sub: canales que publica Playback-Service
    # (playback-service/src/playback/playback.service.ts).
    redis_url: str = "redis://localhost:6379"
    progress_channel: str = "playback.progress"
    completed_channel: str = "playback.completed"

    # Catalog-Service: de él se obtienen los metadatos para construir el
    # embedding de cada título (categoría, tipo, clasificación, sinopsis).
    catalog_service_url: str = "http://localhost:3002"
    catalog_timeout_seconds: float = 2.0
    catalog_retries: int = 2
    catalog_sync_regions: str = "CO,MX,GLOBAL"
    catalog_sync_interval_seconds: int = 60

    # Peso del filtrado basado en contenido en el puntaje híbrido; el resto
    # (1 - content_weight) corresponde al filtrado colaborativo.
    content_weight: float = 0.6
    # Cuántos perfiles parecidos se consultan para el filtrado colaborativo.
    neighbors: int = 10

    cors_origins: str = "*"
    node_env: str = "development"

    @property
    def sync_regions(self) -> list[str]:
        return [r.strip().upper() for r in self.catalog_sync_regions.split(",") if r.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
