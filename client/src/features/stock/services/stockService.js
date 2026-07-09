import api from '@/services/api';

export async function fetchStocks() {
  const { data } = await api.get('/stocks');
  return data;
}
