import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor: automatically attach token from localStorage
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const token = localStorage.getItem('agrisense_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // LocalStorage unavailable (SSR/private window sandbox)
  }
  return config;
});

// Helper for native fetch calls or services wanting direct headers
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  try {
    const token = localStorage.getItem('agrisense_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {}
  return headers;
}

export default apiClient;
