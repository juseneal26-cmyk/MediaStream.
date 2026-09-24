import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiting por cuenta (si ya autenticó) y, si no, por IP (sección 5 del
// documento). Los endpoints sensibles (login, registro, cobros) usan un
// límite mucho más estricto que el resto — típicamente de solo lectura,
// como el catálogo — que se vuelve especialmente relevante durante un
// estreno, cuando Playback-Service concentra la mayor parte del tráfico.
function keyFor(req: Request): string {
  return (req as any).accountId || req.ip || 'anon';
}

function tooManyRequestsHandler(req: Request, res: Response) {
  res.status(429).json({
    statusCode: 429,
    message: 'Demasiadas solicitudes. Intente de nuevo en un momento.',
  });
}

export function createDefaultLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFor,
    handler: tooManyRequestsHandler,
  });
}

export function createSensitiveLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFor,
    handler: tooManyRequestsHandler,
  });
}
