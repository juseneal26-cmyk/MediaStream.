import logging

import aio_pika
from pydantic import BaseModel

from app.config import get_settings
from app.schemas.media import MediaFailedEvent, MediaReadyEvent

logger = logging.getLogger(__name__)
settings = get_settings()


class EventPublisher:
    """
    Publica eventos que no pueden perderse usando RabbitMQ, que persiste el
    mensaje hasta que el consumidor confirma su procesamiento y permite
    reintentos ante fallo.

    Contrato con Catalog-Service (el consumidor):
      · exchange  : media.events (tipo topic, durable)
      · routing   : media.ready              -> el título pasa a AVAILABLE
                    media.processing.failed  -> el título pasa a UNAVAILABLE
      · payload   : JSON con title_id (Catalog también acepta titleId)

    El exchange y las routing keys son configurables por entorno, pero sus
    valores por defecto deben coincidir con los que escucha Catalog-Service
    (src/rabbitmq/media-events.consumer.ts).
    """

    def __init__(self) -> None:
        self._connection: aio_pika.RobustConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None
        self._exchange: aio_pika.abc.AbstractExchange | None = None

    async def connect(self) -> None:
        self._connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        self._channel = await self._connection.channel()
        self._exchange = await self._channel.declare_exchange(
            settings.rabbitmq_exchange,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )
        logger.info("Conectado a RabbitMQ, publicando en el exchange %s", settings.rabbitmq_exchange)

    async def close(self) -> None:
        if self._connection:
            await self._connection.close()

    def is_connected(self) -> bool:
        return self._connection is not None and not self._connection.is_closed

    async def publish_media_ready(self, event: MediaReadyEvent) -> None:
        await self._publish(settings.media_ready_routing_key, event)
        logger.info(
            "Evento %s publicado para title_id=%s job_id=%s",
            settings.media_ready_routing_key,
            event.title_id,
            event.job_id,
        )

    async def publish_media_failed(self, event: MediaFailedEvent) -> None:
        await self._publish(settings.media_failed_routing_key, event)
        logger.warning(
            "Evento %s publicado para title_id=%s job_id=%s",
            settings.media_failed_routing_key,
            event.title_id,
            event.job_id,
        )

    async def _publish(self, routing_key: str, event: BaseModel) -> None:
        if self._exchange is None:
            raise RuntimeError("EventPublisher no está conectado a RabbitMQ")

        message = aio_pika.Message(
            body=event.model_dump_json().encode("utf-8"),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await self._exchange.publish(message, routing_key=routing_key)


event_publisher = EventPublisher()
