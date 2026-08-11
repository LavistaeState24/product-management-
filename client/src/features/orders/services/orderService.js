import api from '@/services/api';

function buildOrderFormData(values) {
  const formData = new FormData();

  formData.append('clientName', values.clientName || '');
  formData.append('clientMobile', values.clientMobile || '');
  formData.append('remarks', values.remarks || '');
  formData.append('items', JSON.stringify(values.items || []));

  if (values.productReference instanceof File) {
    formData.append('productReference', values.productReference);
  }

  return formData;
}

export async function createOrder(values) {
  const payload =
    values.productReference instanceof File
      ? buildOrderFormData(values)
      : values;

  const { data } = await api.post('/orders', payload);

  return data;
}

export async function getBossOrders() {
  const { data } = await api.get('/orders');

  return data;
}

export async function getReadyForDispatchOrders() {
  const { data } = await api.get('/orders/ready-for-dispatch');

  return data;
}

export async function getProductionPendingOrders() {
  const { data } = await api.get('/orders/production/pending');

  return data;
}

export async function getProductionActiveOrders() {
  const { data } = await api.get('/orders/production/active');

  return data;
}

export async function getProductionOrders() {
  const { data } = await api.get('/orders/production/all');

  return data;
}

export async function acceptProductionOrder(orderId, readyDays) {
  const { data } = await api.patch(`/orders/${orderId}/accept`, {
    readyDays,
  });

  return data;
}

export async function addProductionProgress(orderId, note) {
  const { data } = await api.patch(`/orders/${orderId}/progress`, {
    note,
  });

  return data;
}

export async function markProductionOrderReady(orderId, items) {
  const { data } = await api.patch(`/orders/${orderId}/ready`, {
    items,
  });

  return data;
}

export async function assignOrderItemNumbers(orderId, items) {
  const { data } = await api.patch(`/orders/${orderId}/item-numbers`, {
    items,
  });

  return data;
}

export async function dispatchOrder(orderId) {
  const { data } = await api.patch(`/orders/${orderId}/dispatch`);

  return data;
}

export async function getOrderNotifications() {
  const { data } = await api.get('/orders/notifications');

  return data;
}

export async function markNotificationSeen(notificationId) {
  const { data } = await api.patch(
    `/orders/notifications/${notificationId}/seen`,
  );

  return data;
}

export async function confirmNotificationForClient(notificationId) {
  const { data } = await api.post(
    `/orders/notifications/${notificationId}/prepare-client-message`,
  );

  return data;
}

export async function getClientMessageLog() {
  const { data } = await api.get('/orders/message-logs');

  return data;
}

export async function openMessageInWhatsApp(messageLogId) {
  const { data } = await api.post(
    `/orders/message-logs/${messageLogId}/open-whatsapp`,
  );

  return data;
}
