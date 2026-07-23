import api from '@/services/api';

export async function fetchSales(params) {
  const { data } = await api.get('/sales', {
    params,
  });

  return data;
}

export async function fetchSaleFormOptions() {
  const { data } = await api.get(
    '/sales/form-options',
  );

  return data;
}

export function normalizeSaleStockOptions(
  data,
  stockType,
) {
  if (
    stockType &&
    Array.isArray(
      data?.stockOptions?.[stockType],
    )
  ) {
    return data.stockOptions[stockType];
  }

  if (
    stockType &&
    Array.isArray(
      data?.data?.stockOptions?.[stockType],
    )
  ) {
    return data.data.stockOptions[stockType];
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.stocks)) {
    return data.stocks;
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

export async function fetchSaleById(saleId) {
  const { data } = await api.get(
    `/sales/${saleId}`,
  );

  return data;
}

export async function createSale(values) {
  const { data } = await api.post(
    '/sales',
    values,
  );

  return data;
}

export async function updateSale(
  saleId,
  values,
) {
  const { data } = await api.put(
    `/sales/${saleId}`,
    values,
  );

  return data;
}

export async function deleteSale(saleId) {
  const { data } = await api.delete(
    `/sales/${saleId}`,
  );

  return data;
}

export async function cancelSale(
  saleId,
  reason,
) {
  const { data } = await api.patch(
    `/sales/${saleId}/cancel`,
    { reason },
  );

  return data;
}

export async function fetchSaleStockOptions({
  stockType,
  search = '',
}) {
  if (!stockType) {
    return [];
  }

  const { data } = await api.get(
    '/sales/form-options',
    {
      params: {
        stockType,
        search,
      },
    },
  );

  return normalizeSaleStockOptions(
    data,
    stockType,
  );
}
