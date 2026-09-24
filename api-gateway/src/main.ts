import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppModule } from './app.module';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { createAuthMiddleware } from './common/auth.middleware';
import { createDefaultLimiter, createSensitiveLimiter } from './common/rate-limit';
import { buildRoutes } from './proxy/routes.config';

async function bootstrap() {
  // bodyParser: false — el Gateway nunca lee ni transforma el body de la
  // solicitud, solo la reenvía tal cual al microservicio de destino. Esto es
  // obligatorio para que /api/media/ingest (subida de vídeo, multipart) se
  // pueda proxyar en streaming sin que Nest intente parsearlo primero.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: ['log', 'error', 'warn'],
  });

  app.use(cookieParser());
  app.use(new RequestIdMiddleware().use);

  // CORS (sección 5 y 10): el Gateway es el ÚNICO que necesita CORS — los
  // microservicios de detrás ya no reciben solicitudes directas del navegador,
  // solo del Gateway (servidor a servidor, sin origen que validar).
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
  const maxDefault = Number(process.env.RATE_LIMIT_MAX_DEFAULT) || 120;
  const maxSensitive = Number(process.env.RATE_LIMIT_MAX_SENSITIVE) || 10;
  const defaultLimiter = createDefaultLimiter(windowMs, maxDefault);
  const sensitiveLimiter = createSensitiveLimiter(windowMs, maxSensitive);
  const authMiddleware = createAuthMiddleware(
    process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  );

  const routes = buildRoutes(process.env);

  for (const route of routes) {
    app.use(route.prefix, (req, res, next) => {
      const fullPath = req.baseUrl + req.path;

      // 1) Rate limiting: estricto en rutas sensibles (login, cobros),
      //    permisivo en el resto (sección 5 del documento).
      const limiter = route.sensitivePaths.includes(fullPath)
        ? sensitiveLimiter
        : defaultLimiter;

      limiter(req, res, (err?: unknown) => {
        if (err) return next(err);

        // 2) Autenticación centralizada, salvo rutas públicas (registro,
        //    login, refresh, webhook de Stripe).
        if (route.publicPaths.includes(fullPath)) {
          return next();
        }
        authMiddleware(req, res, next);
      });
    });

    // 3) Proxy hacia el microservicio: mismo path, solo cambia el host.
    app.use(
      route.prefix,
      createProxyMiddleware({
        target: route.target,
        changeOrigin: true,
        // Los microservicios ya loguean por su propio RequestIdMiddleware
        // usando esta misma cabecera; solo hace falta no perderla al saltar
        // de servidor a servidor.
        onProxyReq: (proxyReq, req) => {
          const requestId = (req as any).requestId;
          if (requestId) proxyReq.setHeader('x-request-id', requestId);
        },
        logLevel: 'silent',
      } as any),
    );
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
  Logger.log(`API Gateway escuchando en el puerto ${port}`, 'Bootstrap');
  Logger.log(
    `Enrutando: ${routes.map((r) => `${r.prefix} → ${r.target}`).join(' | ')}`,
    'Bootstrap',
  );
}
bootstrap();
