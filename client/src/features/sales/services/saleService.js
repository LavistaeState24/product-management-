import api from '@/services/api';

export async function fetchSales(params) {
  const { data } = await api.get('/sales', { params });
  return data;
}

export async function fetchSaleFormOptions() {
  const { data } = await api.get('/sales/form-options');
  return data;
}

export async function fetchSaleById(saleId) {
  const { data } = await api.get(`/sales/${saleId}`);
  return data;
}

export async function createSale(values) {
  const { data } = await api.post('/sales', values);
  return data;
}

export async function updateSale(saleId, values) {
  const { data } = await api.put(`/sales/${saleId}`, values);
  return data;
}

export async function deleteSale(saleId) {
  const { data } = await api.delete(`/sales/${saleId}`);
  return data;
}
