import api from '@/services/api';

export async function fetchUserOptions() {
  const response = await api.get('/users/options');
  return response.data;
}

export async function fetchUsers(params = {}) {
  const response = await api.get('/users', { params });
  return response.data;
}

export async function createUser(payload) {
  const response = await api.post('/users', payload);
  return response.data;
}

export async function updateUser(userId, payload) {
  const response = await api.put(`/users/${userId}`, payload);
  return response.data;
}

export async function updateUserActiveStatus(userId, isActive) {
  const response = await api.patch(
    `/users/${userId}/active-status`,
    { isActive },
  );

  return response.data;
}

export async function deleteUser(userId) {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
}