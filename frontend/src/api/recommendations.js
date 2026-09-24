import { api } from './client';

export const recommendationsApi = {
  getForProfile: (profileId) =>
    api.get(`/api/recommendations/${profileId}`).then((r) => r.data),
};
