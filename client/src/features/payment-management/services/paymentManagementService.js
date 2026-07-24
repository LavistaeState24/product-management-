import api from '@/services/api';

export async function fetchPaymentManagementPurchases(params) {
  const { data } = await api.get('/payment-management/purchases', {
    params,
  });

  return data;
}

export async function fetchPaymentManagementCustomers(params) {
  const { data } = await api.get('/payment-management/customers', {
    params,
  });

  return data;
}

export async function recordPurchasePayment(purchaseId, values) {
  const { data } = await api.post(
    `/payment-management/purchases/${purchaseId}/payments`,
    values,
  );

  return data;
}

export async function recordSalePayment(saleId, values) {
  const { data } = await api.post(
    `/payment-management/sales/${saleId}/payments`,
    values,
  );

  return data;
}

export async function fetchPurchasePaymentHistory(purchaseId) {
  const { data } = await api.get(
    `/payment-management/purchases/${purchaseId}/payments`,
  );

  return data;
}

export async function fetchSalePaymentHistory(saleId) {
  const { data } = await api.get(
    `/payment-management/sales/${saleId}/payments`,
  );

  return data;
}

export async function fetchPaymentReminders() {
  const { data } = await api.get('/payment-management/reminders');

  return data;
}
