import api from '@/services/api';

export async function fetchPUProductManufacturing(params) {
  const { data } = await api.get('/pu-product-manufacturing', { params });
  return data;
}

export async function fetchPUProductManufacturingBatch(id) {
  const { data } = await api.get(`/pu-product-manufacturing/${id}`);
  return data;
}

export async function createPUProductManufacturing(values) {
  const { data } = await api.post('/pu-product-manufacturing', values);
  return data;
}

export async function updatePUProductManufacturing(id, values) {
  const { data } = await api.put(`/pu-product-manufacturing/${id}`, values);
  return data;
}

export async function deletePUProductManufacturing(id) {
  const { data } = await api.delete(`/pu-product-manufacturing/${id}`);
  return data;
}

export async function fetchPUProductStock(params) {
  const { data } = await api.get('/pu-product-stock', { params });
  return data;
}

export async function searchPUProductStock(params) {
  const { data } = await api.get('/pu-product-stock/search', { params });
  return data;
}

export async function fetchPUProductStockItem(id) {
  const { data } = await api.get(`/pu-product-stock/${id}`);
  return data;
}
