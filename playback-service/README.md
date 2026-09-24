# Playback-Service

Microservicio de reproducción de **MediaStream**. Gestiona el estado de reproducción de cada
usuario (posición exacta, dispositivo utilizado), genera tokens de acceso DRM de corta duración
para los streams, y aplica las reglas de gestión de derechos digitales según el contenido.

Es el servicio que concentra la mayor carga de tráfico durante los estrenos y tiene requisitos
de latencia exigentes, por eso está separado de los procesos pesados de transcodificación.

---

## Stack tecnológico

| Componente | Tecnología | Rol |
|---|---|---|
| Runtime | Node.js 20 + NestJS 10 | Bajo overhead y buena integración con Redis |
| Base de datos | PostgreSQL 16 + Prisma | Tabla `watch_progress` (propia del servicio) |
| Cache / eventos | Redis 7 | Sesiones activas + Pub/Sub de eventos de reproducción |
| DRM | JWT firmado (`@nestjs/jwt`) | Token de corta duración simulado |
| Documentación | Swagger (OpenAPI) | Disponible en `/docs` |

---

## Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/playback/token/{title_id}` | Genera el token de acceso DRM de corta duración para iniciar la reproducción. |
| `POST` | `/api/playback/progress` | Registra la posición actual de reproducción de un perfil. |
| `GET` | `/api/playback/resume/{profile_id}` | Consulta el punto de continuación de una serie en curso. |
| `GET` | `/health` | Liveness probe. |
| `GET` | `/health/ready` | Readiness probe (Postgres, Redis, Catalog-Service). |
| `GET` | `/docs` | Documentación Swagger interactiva. |
| `GET` | `/` | Consola web de pruebas. |

### `GET /api/playback/token/{title_id}`

Parámetros de query: `profileId` (requerido), `region` (requerido), `deviceId` (opcional).

Antes de emitir el token, el servicio llama **de forma síncrona** al Catalog-Service para
verificar que el título exista, esté en estado `AVAILABLE` y tenga licencia vigente en la
región del usuario. Si algo falla, responde `403` o `404` y no emite token.

```bash
curl "http://localhost:3003/api/playback/token/1?profileId=profile-42&region=CO"
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "sessionId": "b3f2...",
  "titleId": "1",
  "titleName": "El Último Meridiano",
  "expiresAt": "2026-01-01T00:05:00.000Z",
  "expiresInSeconds": 300,
  "manifestUrl": "https://cdn.mediastream.local/titles/1/master.m3u8"
}
```

### `POST /api/playback/progress`

```bash
curl -X POST http://localhost:3003/api/playback/progress \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "profile-42",
    "titleId": "1",
    "positionSeconds": 1830,
    "durationSeconds": 7200,
    "deviceId": "smart-tv-samsung-01"
  }'
```

Al superar el **95%** del contenido, el registro se marca como `completed` y se publica el
evento `playback.completed`.

### `GET /api/playback/resume/{profile_id}`

Query opcional: `titleId` (punto de continuación de un título puntual) e `includeCompleted`.

---

## Persistencia y comunicación

**Base de datos propia** (patrón *database-per-service*), tabla `watch_progress`:

| Columna | Tipo | Notas |
|---|---|---|
| `profile_id` | TEXT | Perfil del usuario |
| `title_id` | BIGINT | Id del título en el catálogo |
| `episode_id` | BIGINT? | Solo para series |
| `position_seconds` | INT | Posición exacta |
| `duration_seconds` | INT? | Para calcular el porcentaje |
| `completed` | BOOLEAN | ≥95% visto |
| `device_id` | TEXT? | Dispositivo utilizado |
| `updated_at` | TIMESTAMP | |

Restricción única sobre `(profile_id, title_id, episode_id)`: un perfil tiene un solo punto de
continuación por episodio.

**Comunicación síncrona** — REST con Catalog-Service para verificar la disponibilidad regional
antes de generar el token. Las respuestas se cachean 60s en Redis, porque es el camino crítico
de mayor tráfico.

**Comunicación asíncrona** — Redis Pub/Sub:

| Canal | Cuándo | Consumidor previsto |
|---|---|---|
| `playback.progress` | En cada reporte de posición | Analítica |
| `playback.completed` | Al superar el 95% | Recommendation-Service |

---

## Puesta en marcha

### Requisitos previos

Playback depende de Catalog-Service. Levántalo primero:

```bash
cd ../catalog-service
docker compose up --build -d
```

### Levantar este servicio

```bash
cp .env.example .env
docker compose up --build
```

Esto levanta Postgres (`5434`), Redis (`6380`) y el servicio (`3003`), aplica las migraciones
y arranca. Luego abre:

- Consola de pruebas: http://localhost:3003/
- Swagger: http://localhost:3003/docs

### Desarrollo local (sin Docker para el servicio)

```bash
docker compose up playback-db playback-redis -d
npm install
npx prisma migrate dev
npm run start:dev
```

---

## Scripts de demostración

**Escuchar los eventos publicados** (simula lo que hará Recommendation-Service):

```bash
node scripts/listen-playback-events.js
```

**Simular una sesión de reproducción completa**:

```bash
node scripts/simulate-playback.js 1 profile-42 CO
```

Pide el token, reporta progreso hasta el final y consulta el punto de continuación. Con el
listener corriendo en otra terminal verás aparecer `playback.progress` y `playback.completed`.

---

## Tests

```bash
npm test
```

Cubren la emisión de tokens (título inexistente, `PENDING`, sin licencia regional), el cálculo
del porcentaje, la marca de completado y el uso del cache en `resume`.

---

## Uniendo los microservicios

Cada servicio es autónomo: su propio `package.json`, `Dockerfile`, base de datos y ciclo de
despliegue. Se comunican solo por REST y Redis Pub/Sub, nunca compartiendo tablas.

La estructura recomendada del repositorio:

```
mediastream/
├── catalog-service/
├── playback-service/
├── recommendation-service/
└── docker-compose.yml     ← orquesta todos juntos
```

Ambos `docker-compose.yml` ya declaran la red compartida **`mediastream-net`**, así que los
contenedores se resuelven entre sí por nombre (`http://catalog-service:3002`). Si levantas
Catalog-Service con su compose actual (que aún no declara esa red), conéctalo con:

```bash
docker network create mediastream-net   # si no existe
docker network connect mediastream-net catalog-service
```

O añade a su `docker-compose.yml` el mismo bloque `networks` que tiene este servicio.

### Variables de entorno

Ver `.env.example`. Las más importantes:

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto del servicio | `3003` |
| `DATABASE_URL` | Postgres propio | — |
| `REDIS_URL` | Redis para cache y Pub/Sub | `redis://localhost:6379` |
| `CATALOG_SERVICE_URL` | Base del Catalog-Service | `http://localhost:3002` |
| `DRM_JWT_SECRET` | Clave de firma del token DRM | (cambiar en producción) |
| `DRM_TOKEN_TTL_SECONDS` | Vigencia del token | `300` |
| `CDN_BASE_URL` | Base de los manifiestos HLS | `https://cdn.mediastream.local` |

---

## Nota sobre el DRM

El token es un **JWT firmado que simula** un sistema DRM real. En producción, este servicio
sería el punto de integración con un proveedor de licencias (Widevine, PlayReady, FairPlay):
el payload actual (`sub`, `titleId`, `region`, `deviceId`, `sessionId`, `scope`) es
precisamente el conjunto de datos que se enviaría al servidor de licencias. La estructura del
código permite reemplazar `JwtService` por el SDK del proveedor sin tocar controllers ni DTOs.
