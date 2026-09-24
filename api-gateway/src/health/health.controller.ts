import { Controller, Get } from '@nestjs/common';
import axios from 'axios';
import { buildRoutes } from '../proxy/routes.config';

@Controller('health')
export class HealthController {
  // Vivo: el proceso responde. Nunca depende de los microservicios de abajo
  // (igual filosofía de tolerancia a fallos que el resto de MediaStream).
  @Get()
  health() {
    return { status: 'ok', service: 'api-gateway' };
  }

  // Listo para tráfico (sección 9 del documento): a diferencia de /health,
  // aquí sí reporta el estado de cada microservicio, pero SIEMPRE devuelve
  // 200 — que uno de ellos esté caído no significa que el Gateway no pueda
  // enrutar tráfico, solo que esa ruta en particular fallará.
  @Get('ready')
  async ready() {
    const routes = buildRoutes(process.env);
    const checks = await Promise.all(
      routes.map(async (route) => {
        const name = route.prefix.replace('/api/', '');
        try {
          const res = await axios.get(`${route.target}/health`, { timeout: 1500 });
          return [name, res.status === 200 ? 'ok' : 'degraded'] as const;
        } catch {
          return [name, 'unreachable'] as const;
        }
      }),
    );
    return {
      status: 'ok',
      service: 'api-gateway',
      downstream: Object.fromEntries(checks),
    };
  }
}
