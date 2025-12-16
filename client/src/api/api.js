// api.js
// Updated axios instance — ensures requests go to /api and attaches Bearer token automatically.

import axios from 'axios';

const DEFAULT_BASE = 'http://localhost:5000/api';

// Allow env override (create-react-app uses REACT_APP_API_URL)
const baseURL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ? process.env.REACT_APP_API_URL : DEFAULT_BASE;

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token if present
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        // Some backends expect "Bearer <token>"
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize errors a bit (so frontend can trust err.response.data)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // If the error has no response (network), keep it as-is
    if (!err.response) return Promise.reject(err);

    // Ensure there's a data object
    if (!err.response.data) {
      err.response.data = { error: err.response.statusText || 'Request failed' };
    } else if (typeof err.response.data === 'string') {
      err.response.data = { error: err.response.data };
    }
    return Promise.reject(err);
  }
);

export default api;
