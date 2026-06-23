import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (import.meta.env.DEV) {
    console.info('[AUTH] API REQUEST', { url: config.url, hasToken: Boolean(token) });
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const requestUrl = err.config?.url || '';

    if (status === 401 && !requestUrl.includes('/users/login') && !requestUrl.includes('/users/signup')) {
      console.warn('[AUTH] API 401 REDIRECT', { url: requestUrl });
      // session expired or invalid token: clear and redirect to login
      localStorage.removeItem('token');
      try { window.location.href = '/login?expired=1'; } catch { /* ignore */ }
    }

    return Promise.reject(err);
  }
);

export default api;
