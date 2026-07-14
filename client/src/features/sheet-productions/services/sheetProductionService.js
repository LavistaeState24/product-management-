import api from '@/services/api';

export async function fetchSheetProductions(params) {
  const { data } = await api.get('/sheet-production', { params });
  return data;
}

export async function fetchSheetProduction(id) {
  const { data } = await api.get(`/sheet-production/${id}`);
  return data;
}

export async function createSheetProduction(values) {
  const { data } = await api.post('/sheet-production', values);
  return data;
}

export async function updateSheetProduction(id, values) {
  const { data } = await api.put(`/sheet-production/${id}`, values);
  return data;
}

export async function deleteSheetProduction(id) {
  const { data } = await api.delete(`/sheet-production/${id}`);
  return data;
}

export async function fetchSheetStocks(params) {
  const { data } = await api.get('/sheet-stock', { params });
  return data;
}

export async function searchSheetStocks(params) {
  const { data } = await api.get('/sheet-stock/search', { params });
  return data;
}

export async function fetchSheetStock(id) {
  const { data } = await api.get(`/sheet-stock/${id}`);
  return data;
}
