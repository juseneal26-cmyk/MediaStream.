import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Genera (o respeta, si ya viene de un proxy delante) el request-id de esta
// solicitud y lo propaga como cabecera hacia el microservicio de destino.
// Es la MISMA convención que ya usan Catalog-Service y Playback-Service
// (x-request-id), descrita en las secciones 5 y 9 del documento de
// arquitectura: al pasar por todos los servicios, permite reconstruir el
// recorrido completo de una solicitud en los logs.
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use = (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    (req as any).requestId = requestId;
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const start = Date.now();
    res.on('finish', () => {
      const logLine = {
        level: 'info',
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        latencyMs: Date.now() - start,
        accountId: (req as any).accountId ?? null,
      };
      this.logger.log(JSON.stringify(logLine));
    });

    next();
  };
}
