import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Production: https://kpmgbackend-production-8d42.up.railway.app/api
// Android Emulator: http://10.0.2.2:8000/api
// Physical Phone (same WiFi): http://192.168.1.33:8000/api
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  // 30s timeout — Railway free tier can take 20-30s on cold start
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle session expiration (401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear authentication and force logout
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  }
);

export default api;
