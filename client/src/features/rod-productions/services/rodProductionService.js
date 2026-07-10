import api from '@/services/api';

export async function createRodProduction(values) {
  const { data } = await api.post('/rod-productions', values);
  return data;
}

export async function fetchRodStocks(params) {
  const { data } = await api.get('/rod-stocks', { params });
  return data;
}
