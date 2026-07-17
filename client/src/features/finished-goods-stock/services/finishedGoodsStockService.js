import api from '@/services/api';

export async function fetchFinishedGoodsStock(params) {
  const { data } = await api.get('/finished-goods-stock', { params });
  return data;
}
