# Frontend

El **único** frontend de MediaStream (sección 8.1 del documento de
arquitectura). Reemplaza a las 6 consolas de prueba que traía cada
microservicio: esta es la aplicación real que usaría un usuario final
—registro, catálogo, reproducción, recomendaciones y facturación— y habla
únicamente con el API Gateway.

## Qué cubre

- **Autenticación**: registro, login, sesión persistente vía RefreshToken
  (cookie httpOnly) y renovación automática del AccessToken al expirar.
- **Perfiles**: selector "¿quién ve ahora?", con control parental
  (perfiles infantiles solo ven catálogo apto).
- **Catálogo**: explorar por región y categoría, ver detalle, temporadas y
  episodios, y disponibilidad regional.
- **Reproducción**: token DRM de corta duración, reproductor simulado que
  reporta progreso periódicamente.
- **Recomendaciones**: sugerencias híbridas del perfil activo.
- **Facturación**: suscribirse, cambiar de plan e historial de pagos.
- **Banner de estado de cuenta**: avisa si la cuenta está `MOROSA` o
  `SUSPENDIDA` (por el patrón Saga de payment.failed, sección 4.3).

## Correr en local

```bash
npm install
cp .env.example .env
npm run dev
```

Abre `http://localhost:5173`. Necesita el API Gateway corriendo en
`http://localhost:3000` (ver `../api-gateway`), y este a su vez a los 6
microservicios.

## Variables de entorno

- `VITE_API_GATEWAY_URL` — URL base del API Gateway. Se inyecta en tiempo de
  build (Vite), así que hay que reconstruir si cambia entre entornos.
