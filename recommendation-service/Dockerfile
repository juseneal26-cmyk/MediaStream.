FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV PORT=3005
EXPOSE 3005

# Ejecuta las migraciones pendientes (Alembic crea la extensión pgvector y
# las tablas) y luego arranca el servicio, igual que el resto de
# microservicios de MediaStream.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
