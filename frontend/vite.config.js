import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Variables de entorno en build time (sección 8.1 del documento): la URL
// base del API Gateway se inyecta al construir, distinta por entorno
// (desarrollo / staging / producción). Ver .env.example.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
