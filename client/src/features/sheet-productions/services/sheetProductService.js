import api from '@/services/api';

export async function createSheetProductManufacturing(values) {
  const { data } = await api.post('/sheet-product-manufacturing', values);
  return data;
}
