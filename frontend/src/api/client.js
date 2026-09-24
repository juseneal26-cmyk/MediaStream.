import axios from 'axios';

// El frontend SOLO conoce al API Gateway (sección 8.1 del documento):
// nunca llama a un microservicio por su cuenta ni conoce sus direcciones.
const baseURL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL,
  // El RefreshToken viaja en una cookie httpOnly con path=/api/users/refresh
  // (la pone User-Service, sección 10 del documento): withCredentials es lo
  // que hace que el navegador la envíe y la reciba.
  withCredentials: true,
});

// Estado del AccessToken en memoria (nunca en localStorage: si un XSS lo
// leyera de ahí podría reusarlo; en memoria muere al cerrar la pestaña, y
// el RefreshToken en su cookie httpOnly permite recuperar la sesión).
let accessToken = null;
let onUnauthorized = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Si el AccessToken expiró (401), se intenta renovar UNA vez contra
// /api/users/refresh (usa la cookie httpOnly) y se reintenta la solicitud
// original. Si el refresh también falla, se cierra la sesión.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response || response.status !== 401 || config.__isRetry || config.url === '/api/users/refresh') {
      return Promise.reject(error);
    }

    config.__isRetry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = api.post('/api/users/refresh').finally(() => {
          refreshPromise = null;
        });
      }
      const { data } = await refreshPromise;
      setAccessToken(data.accessToken);
      config.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(config);
    } catch (refreshError) {
      setAccessToken(null);
      onUnauthorized();
      return Promise.reject(refreshError);
    }
  },
);
