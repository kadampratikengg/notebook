// client/src/api/index.js
import axios from 'axios';

// Base URL: when running CRA dev server, requests to '/api' will be proxied (or hit your backend)
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials: true, // enable if you use cookies/sessions
});

// Attach token if present in localStorage for each request
api.interceptors.request.use((cfg) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      cfg.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore storage errors
  }
  return cfg;
}, (err) => Promise.reject(err));

export default api;
