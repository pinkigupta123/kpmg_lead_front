import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// We can define the default local URL.
// When testing on physical devices, replace this with your host's local IP address (e.g., 'http://192.168.1.X:8000/api')
// For Android emulator, 'http://10.0.2.2:8000/api' works by default.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
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
