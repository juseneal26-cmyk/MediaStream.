import { api } from './client';

export const usersApi = {
  register: (data) => api.post('/api/users/register', data).then((r) => r.data),
  login: (data) => api.post('/api/users/login', data).then((r) => r.data),
  refresh: () => api.post('/api/users/refresh').then((r) => r.data),
  listProfiles: (accountId) =>
    api.get(`/api/users/profiles/${accountId}`).then((r) => r.data),
};
