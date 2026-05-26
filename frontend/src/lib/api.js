import axios from 'axios';
import Cookies from 'js-cookie';

// Create an Axios instance
const api = axios.create({
  // 🚨 CRITICAL FIX: Use the environment variable FIRST. Fall back to localhost ONLY if the variable doesn't exist.
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Allows cross-origin cookie handling
});

// Intercept outgoing requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('stip_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept incoming responses to handle expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handling 401 Unauthorized errors
    if (error.response?.status === 401) {
      Cookies.remove('stip_token');
      Cookies.remove('stip_user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;