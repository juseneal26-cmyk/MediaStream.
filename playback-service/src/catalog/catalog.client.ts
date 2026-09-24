import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { RedisService } from '../redis/redis.service';

export interface CatalogTitle {
  id: string;
  name: string;
  status: 'PENDING' | 'AVAILABLE' | 'UNAVAILABLE';
  type: 'MOVIE' | 'SERIES';
  category?: string | null;
  ageRating?: string | null;
}

export interface CatalogAvailability {
  region: string;
  availableFrom: string;
  availableUntil?: string | null;
  isAvailableNow?: boolean;
}

/**
 * Comunicación síncrona con Catalog-Service vía API REST.
 *
 * El documento indica que Playback debe verificar la disponibilidad regional
 * del título antes de generar el token. Como este es el camino crítico de
 * mayor tráfico, cacheamos las respuestas en Redis por poco tiempo: la
 * disponibilidad cambia con baja frecuencia, pero se consulta en cada inicio
 * de reproducción.
 */
@Injectable()
export class CatalogClient {
  private readonly logger = new Logger(CatalogClient.name);
  private readonly http: AxiosInstance;

  constructor(private readonly redis: RedisService) {
    this.http = axios.create({
      baseURL: process.env.CATALOG_SERVICE_URL ?? 'http://localhost:3002',
      timeout: parseInt(process.env.CATALOG_TIMEOUT_MS ?? '3000', 10),
    });
  }

  async getTitle(titleId: string): Promise<CatalogTitle | null> {
    const cacheKey = `catalog:title:${titleId}`;
    const cached = await this.redis.get<CatalogTitle>(cacheKey);
    if (cached) return cached;

    try {
      const { data } = await this.http.get(`/api/catalog/titles/${titleId}`);
      const title: CatalogTitle = {
        id: String(data.id),
        name: data.name,
        status: data.status,
        type: data.type,
        category: data.category ?? null,
        ageRating: data.ageRating ?? null,
      };
      await this.redis.set(cacheKey, title, 60);
      return title;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      this.logger.error(
        `Fallo consultando el título ${titleId} en Catalog-Service: ${err.message}`,
      );
      // Sin verificación no se emite token DRM. Se responde 503 con un
      // mensaje claro en lugar de un 500 genérico: el servicio sigue vivo,
      // solo esta función está degradada mientras Catalog no responda.
      throw this.unavailable();
    }
  }

  async isAvailableInRegion(titleId: string, region: string): Promise<boolean> {
    const cacheKey = `catalog:avail:${titleId}:${region}`;
    const cached = await this.redis.get<boolean>(cacheKey);
    if (cached !== null) return cached;

    try {
      const { data } = await this.http.get(
        `/api/catalog/titles/${titleId}/availability`,
      );
      const rows: CatalogAvailability[] = Array.isArray(data) ? data : [];
      const now = Date.now();

      const allowed = rows.some((a) => {
        const matchesRegion =
          a.region?.toUpperCase() === region.toUpperCase() ||
          a.region?.toUpperCase() === 'GLOBAL';
        if (!matchesRegion) return false;
        if (typeof a.isAvailableNow === 'boolean') return a.isAvailableNow;
        const from = new Date(a.availableFrom).getTime();
        const until = a.availableUntil
          ? new Date(a.availableUntil).getTime()
          : Number.POSITIVE_INFINITY;
        return from <= now && now <= until;
      });

      await this.redis.set(cacheKey, allowed, 60);
      return allowed;
    } catch (err: any) {
      this.logger.error(
        `Fallo consultando disponibilidad de ${titleId}: ${err.message}`,
      );
      throw this.unavailable();
    }
  }

  private unavailable() {
    return new ServiceUnavailableException(
      'Catalog-Service no responde: no se puede verificar la licencia del título. ' +
        'El resto de Playback sigue funcionando.',
    );
  }

  /** Usado por el readiness probe: ¿respondemos al servicio del que dependemos? */
  async isReachable(): Promise<boolean> {
    try {
      await this.http.get('/health', { timeout: 1500 });
      return true;
    } catch {
      return false;
    }
  }
}
