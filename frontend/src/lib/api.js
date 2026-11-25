import axios from 'axios';

const TOKEN_KEY = 'helpdesk_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Let the AuthContext react to expired/invalid sessions
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthCall = err.config?.url?.startsWith('/auth/');
    if (err.response?.status === 401 && !isAuthCall) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  register: (body) => api.post('/auth/register', body).then((r) => r.data.data),
  login: (body) => api.post('/auth/login', body).then((r) => r.data.data),
  me: () => api.get('/auth/me').then((r) => r.data.data.user),
};

export const ticketApi = {
  list: (params) => api.get('/tickets', { params }).then((r) => r.data),
  get: (id) => api.get(`/tickets/${id}`).then((r) => r.data.data),
  create: (body) => api.post('/tickets', body).then((r) => r.data.data),
  update: (id, body) => api.patch(`/tickets/${id}`, body).then((r) => r.data.data),
  remove: (id) => api.delete(`/tickets/${id}`).then((r) => r.data),
  adminUpdate: (id, body) => api.patch(`/admin/tickets/${id}`, body).then((r) => r.data.data),
  comments: (id) => api.get(`/tickets/${id}/comments`).then((r) => r.data.data),
  addComment: (id, body) => api.post(`/tickets/${id}/comments`, { body }).then((r) => r.data.data),
  activity: (id) => api.get(`/tickets/${id}/activity`).then((r) => r.data.data),
  stats: () => api.get('/stats').then((r) => r.data.data),
  recentActivity: () => api.get('/admin/activity', { params: { limit: 8 } }).then((r) => r.data.data),
};

export const notificationApi = {
  list: () => api.get('/notifications', { params: { limit: 15 } }).then((r) => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post('/notifications/read-all').then((r) => r.data),
};
