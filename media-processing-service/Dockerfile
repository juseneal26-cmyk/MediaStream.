FROM python:3.12-slim

# FFmpeg es una dependencia de sistema, no de pip: necesaria para el
# wrapper de transcodificación (adaptive bitrate streaming).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV PORT=3004
EXPOSE 3004

# Ejecuta migraciones pendientes (Alembic) y luego arranca el servicio,
# igual que el patrón de arranque del resto de microservicios de MediaStream.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
