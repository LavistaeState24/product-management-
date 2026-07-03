import axios from 'axios';
import { API_BASE_URL } from '@/config/env';
import { storage } from '@/services/storage';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = storage.getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
