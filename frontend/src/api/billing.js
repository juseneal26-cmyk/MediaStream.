import { api } from './client';

export const billingApi = {
  subscribe: (data) => api.post('/api/billing/subscribe', data).then((r) => r.data),
  changePlan: (data) => api.put('/api/billing/plan', data).then((r) => r.data),
  history: (accountId) => api.get(`/api/billing/history/${accountId}`).then((r) => r.data),
};
