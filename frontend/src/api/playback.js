import { api } from './client';

export const playbackApi = {
  getToken: (titleId, params) =>
    api.get(`/api/playback/token/${titleId}`, { params }).then((r) => r.data),
  saveProgress: (data) => api.post('/api/playback/progress', data).then((r) => r.data),
  getResume: (profileId, params) =>
    api.get(`/api/playback/resume/${profileId}`, { params }).then((r) => r.data),
};
