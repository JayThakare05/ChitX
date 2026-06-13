import axios from 'axios';

// Base URL is read from the Vite env variable.
// In development, create a frontend/.env file with:
//   VITE_API_URL=http://localhost:5000
// If the env var is not set, it falls back to localhost:5000.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds — AI endpoints can be slow
});

// ──────────────────────────────────────────────
// Request interceptor
// ──────────────────────────────────────────────
// Attach wallet address from localStorage to every request header
// so the backend always knows who is calling (no JWT needed).
apiClient.interceptors.request.use(
  (config) => {
    const wallet = localStorage.getItem('chitx_wallet');
    if (wallet) {
      config.headers['x-wallet-address'] = wallet;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ──────────────────────────────────────────────
// Response interceptor
// ──────────────────────────────────────────────
// Normalise error messages so every feature's catch block
// can just read error.message without guessing the shape.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
