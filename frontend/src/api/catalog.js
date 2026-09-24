import { api } from './client';

export const catalogApi = {
  listTitles: (params) => api.get('/api/catalog/titles', { params }).then((r) => r.data),
  getTitle: (id) => api.get(`/api/catalog/titles/${id}`).then((r) => r.data),
  getAvailability: (id) =>
    api.get(`/api/catalog/titles/${id}/availability`).then((r) => r.data),
};
