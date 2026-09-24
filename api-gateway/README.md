# API Gateway

Único punto de entrada del Cliente hacia MediaStream (sección 5 del
documento de arquitectura). El frontend (`../frontend`) es el único cliente
que debe hablarle directamente — nunca llama a los microservicios por su
cuenta.

## Qué hace

- **Enruta** cada prefijo al microservicio correspondiente, manteniendo el
  mismo path (`/api/catalog/...` → `CATALOG_SERVICE_URL/api/catalog/...`).
- **Autentica**: valida la firma y expiración del AccessToken (JWT) con el
  mismo secreto que usa User-Service, sin tener que consultarlo. Si es
  válido, agrega `x-account-id` como cabecera interna hacia el
  microservicio de destino. Rutas públicas (no requieren token):
  `POST /api/users/register`, `POST /api/users/login`,
  `POST /api/users/refresh` y `POST /api/billing/webhook` (la llama Stripe,
  no el usuario).
- **Rate limiting**: más estricto en login/registro/cobros, más permisivo en
  el resto (catálogo, recomendaciones, etc).
- **CORS**: solo acepta al origen del frontend (`CORS_ORIGINS`). Los
  microservicios de detrás ya no necesitan aceptar el origen del navegador,
  porque solo reciben tráfico del Gateway (servidor a servidor).
- **Logging con request-id**: genera o respeta `x-request-id` y lo propaga
  hacia el microservicio, igual que ya hacen Catalog-Service y
  Playback-Service, para poder rastrear una solicitud entre logs de varios
  servicios.
- **/health** y **/health/ready** (esta última reporta el estado de cada
  microservicio, pero siempre responde 200: que uno esté caído no significa
  que el Gateway no pueda seguir enrutando al resto).

## Correr en local

```bash
npm install
cp .env.example .env
npm run start:dev
```

Necesita los 6 microservicios corriendo (o `docker compose up -d` desde la
raíz del proyecto) para poder enrutarles tráfico.

## Variables de entorno

Ver `.env.example`. Las más importantes:

- `JWT_ACCESS_SECRET` — debe ser **exactamente el mismo** valor que
  `JWT_ACCESS_SECRET` en `user-service/.env`, o el Gateway rechazará tokens
  válidos.
- `CORS_ORIGINS` — el origen del frontend (`http://localhost:5173` en
  desarrollo).
- `*_SERVICE_URL` — la dirección de cada microservicio.
