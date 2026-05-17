import axios from 'axios';
import useAppStore from '../store/useAppStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 10000,
  withCredentials: true,
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
  (config) => {
    const token = useAppStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handlers for Token Rotation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = useAppStore.getState().refreshToken;

      if (refresh) {
        try {
          const res = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh`,
            { refreshToken: refresh },
            { withCredentials: true }
          );

          if (res.data.success) {
            const { accessToken, refreshToken } = res.data;
            const user = useAppStore.getState().user;
            
            // Re-auth state update
            useAppStore.getState().setAuth(user, accessToken, refreshToken);
            
            // Retry initial failed request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('Refresh token expired, logging out...', refreshError);
          useAppStore.getState().clearAuth();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
