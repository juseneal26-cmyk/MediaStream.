import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

/**
 * Autenticación centralizada (sección 5 y 10 del documento de arquitectura).
 *
 * El Gateway valida la firma y expiración del AccessToken (JWT de corta
 * duración, firmado por User-Service con JWT_ACCESS_SECRET) SIN consultar a
 * User-Service. Si es válido, agrega el account_id como cabecera interna
 * (x-account-id) hacia el microservicio de destino, que confía en ella
 * porque solo el Gateway puede inyectarla (nunca llega directo del Cliente:
 * cualquier x-account-id que traiga la petición original se descarta antes
 * de validar).
 *
 * El perfil activo (x-profile-id) lo elige el Cliente en cada solicitud
 * (p. ej. tras el selector "¿quién ve ahora?") y el Gateway simplemente lo
 * reenvía tal cual; cada microservicio es quien decide si ese perfil
 * pertenece a la cuenta autenticada.
 */
export function createAuthMiddleware(secret: string) {
  return function authMiddleware(req: Request, res: Response, next: NextFunction) {
    // Nunca confiar en cabeceras internas que vengan ya puestas por el Cliente.
    delete req.headers['x-account-id'];
    delete req.headers['x-account-email'];

    const authHeader = req.headers['authorization'];
    if (!authHeader || Array.isArray(authHeader) || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        statusCode: 401,
        message: 'Falta el AccessToken (Bearer token).',
      });
      return;
    }

    const token = authHeader.slice('Bearer '.length);
    try {
      const payload = jwt.verify(token, secret) as { sub: string; email?: string };
      (req as any).accountId = payload.sub;
      req.headers['x-account-id'] = payload.sub;
      if (payload.email) {
        req.headers['x-account-email'] = payload.email;
      }
      const profileId = req.headers['x-profile-id'];
      if (Array.isArray(profileId)) {
        req.headers['x-profile-id'] = profileId[0];
      }
      next();
    } catch {
      res.status(401).json({
        statusCode: 401,
        message: 'AccessToken inválido o expirado. Use POST /api/users/refresh.',
      });
    }
  };
}
