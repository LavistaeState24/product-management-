import api from '@/services/api';
import { storage } from '@/services/storage';

export async function loginUser(payload) {
  const { data } = await api.post('/auth/login', payload);
  storage.setToken(data.token);
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data;
}

export function logoutUser() {
  storage.clearToken();
}
