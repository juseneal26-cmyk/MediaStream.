import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

// El Gateway no tiene lógica de negocio propia ni base de datos: su único
// trabajo es autenticar, limitar y enrutar. Por eso el único módulo "real"
// es el de salud; el enrutamiento hacia los microservicios se monta
// directamente en main.ts como middleware de Express (ver proxy/routes.config.ts),
// no como controllers de Nest, para poder reenviar el body sin parsearlo
// (necesario para las subidas de vídeo de Media-Processing-Service).
@Module({
  imports: [HealthModule],
})
export class AppModule {}
