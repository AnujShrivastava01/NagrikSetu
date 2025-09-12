import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 40000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - don't redirect automatically
      // Let the auth context handle this gracefully
      console.warn('Authentication failed - token may be expired');
      
      // Only clear tokens if this is not a validation request
      if (!error.config?.url?.includes('/auth/validate')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Dispatch a custom event to notify auth context
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api; 