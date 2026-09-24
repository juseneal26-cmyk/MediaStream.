import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.middleware.exception_handlers import register_exception_handlers
from app.middleware.request_id import RequestIdMiddleware
from app.routers import health, media
from app.services.events import event_publisher

logging.basicConfig(level=logging.INFO)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Conexión a RabbitMQ al arrancar, para publicar media.ready sin
    # abrir/cerrar la conexión en cada job.
    await event_publisher.connect()
    yield
    await event_publisher.close()


app = FastAPI(
    title="Media-Processing-Service",
    description="MediaStream — Ingesta y transcodificación de vídeo maestro (adaptive bitrate streaming).",
    version="1.0.0",
    lifespan=lifespan,
)

# Cada solicitud recibe/propaga un x-request-id y queda registrada en un
# log JSON estructurado (método, ruta, código, latencia) — igual que el
# resto de microservicios de MediaStream, para poder rastrear una
# solicitud a través de los logs de varios servicios.
app.add_middleware(RequestIdMiddleware)

# Cualquier excepción no manejada queda registrada en el log del servidor
# con su traceback completo y su request_id, y el cliente siempre recibe
# un JSON consistente — nunca el "Internal Server Error" en blanco que da
# FastAPI por defecto. Este es el primer lugar a mirar cuando algo falla.
register_exception_handlers(app)

# El frontend de la consola es solo una herramienta de operación interna;
# CORS_ORIGINS es configurable por entorno (coma-separado), "*" por
# defecto para poder abrirlo también fuera de este mismo host (por
# ejemplo, sirviéndolo con Live Server desde VS Code).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas de la API primero: así siempre tienen prioridad sobre los archivos
# estáticos montados debajo.
app.include_router(media.router)
app.include_router(health.router)

# Consola web: sirve app/static/index.html en "/". Debe ir al final para
# no interceptar las rutas de la API.
app.mount("/", StaticFiles(directory="app/static", html=True), name="console")
