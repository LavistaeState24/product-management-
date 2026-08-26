import api from '@/services/api';

export async function createRodProductManufacturing(values) {
  const { data } = await api.post('/rod-product-manufacturing', values);
  return data;
}
