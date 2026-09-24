// Tabla de enrutamiento del Gateway (sección 5 del documento): el Cliente
// nunca conoce las direcciones internas de cada microservicio, solo al
// Gateway. Cada entrada dice a qué servicio va cada prefijo, y cuáles de
// sus rutas son públicas (no requieren AccessToken) o sensibles (rate limit
// más estricto).
export interface ServiceRoute {
  prefix: string;
  target: string;
  // Rutas exactas (con el prefijo completo) que no requieren AccessToken.
  publicPaths: string[];
  // Rutas exactas que llevan el límite de solicitudes estricto.
  sensitivePaths: string[];
}

export function buildRoutes(env: NodeJS.ProcessEnv): ServiceRoute[] {
  return [
    {
      prefix: '/api/users',
      target: env.USER_SERVICE_URL || 'http://localhost:3001',
      publicPaths: ['/api/users/register', '/api/users/login', '/api/users/refresh'],
      sensitivePaths: ['/api/users/register', '/api/users/login'],
    },
    {
      prefix: '/api/catalog',
      target: env.CATALOG_SERVICE_URL || 'http://localhost:3002',
      publicPaths: [],
      sensitivePaths: [],
    },
    {
      prefix: '/api/playback',
      target: env.PLAYBACK_SERVICE_URL || 'http://localhost:3003',
      publicPaths: [],
      sensitivePaths: [],
    },
    {
      prefix: '/api/media',
      target: env.MEDIA_SERVICE_URL || 'http://localhost:3004',
      publicPaths: [],
      sensitivePaths: [],
    },
    {
      prefix: '/api/recommendations',
      target: env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3005',
      publicPaths: [],
      sensitivePaths: [],
    },
    {
      prefix: '/api/billing',
      target: env.BILLING_SERVICE_URL || 'http://localhost:3006',
      // El webhook lo llama Stripe directamente, nunca el Cliente con su
      // AccessToken: no puede exigirse JWT de usuario en esa ruta.
      publicPaths: ['/api/billing/webhook'],
      sensitivePaths: ['/api/billing/subscribe', '/api/billing/plan'],
    },
  ];
}
