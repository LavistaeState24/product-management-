import api from '@/services/api';

export async function fetchDashboard(params) {
  const { data } = await api.get('/dashboard', {
    params,
  });

  return data;
}
