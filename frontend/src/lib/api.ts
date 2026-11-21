import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Strict per-tab session isolation: NEVER share tokens through localStorage across tabs
export function getAccessToken(): string | null {
  return sessionStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem('refreshToken');
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  // Store strictly in this tab's sessionStorage to isolate accounts
  sessionStorage.setItem('accessToken', accessToken);
  sessionStorage.setItem('refreshToken', refreshToken);
  // Clear any shared localStorage tokens so tabs never cross-contaminate
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function clearAuthTokens() {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// Attach Access Token to every outgoing request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for automatic refresh token renewal on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data;
          
          sessionStorage.setItem('accessToken', accessToken);
          sessionStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          clearAuthTokens();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
