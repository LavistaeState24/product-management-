import api from '@/services/api';

function appendField(formData, key, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  formData.append(key, String(value));
}

function buildPurchaseFormData(values) {
  const formData = new FormData();

  appendField(formData, 'supplierName', values.supplierName);
  appendField(formData, 'productName', values.productName);
  appendField(formData, 'purchaseDate', values.purchaseDate);
  appendField(formData, 'quantity', values.quantity);
  appendField(formData, 'purchasePrice', values.purchasePrice);
  appendField(formData, 'gstType', values.gstType);
  appendField(formData, 'gstRate', values.gstRate);
  appendField(formData, 'paymentType', values.paymentType);
  appendField(formData, 'creditDueDate', values.creditDueDate);
  appendField(formData, 'paidAmount', values.paidAmount);
  appendField(formData, 'notes', values.notes);

  if (values.removeBill) {
    formData.append('removeBill', 'true');
  }

  if (values.billUpload instanceof File) {
    formData.append('billUpload', values.billUpload);
  }

  return formData;
}

export async function fetchPurchases(params) {
  const { data } = await api.get('/purchases', { params });
  return data;
}

export async function fetchPurchaseFormOptions() {
  const { data } = await api.get('/purchases/form-options');
  return data;
}

export async function fetchPurchaseById(purchaseId) {
  const { data } = await api.get(`/purchases/${purchaseId}`);
  return data;
}

export async function createPurchase(values) {
  const { data } = await api.post('/purchases', buildPurchaseFormData(values));
  return data;
}

export async function updatePurchase(purchaseId, values) {
  const { data } = await api.put(`/purchases/${purchaseId}`, buildPurchaseFormData(values));
  return data;
}

export async function deletePurchase(purchaseId) {
  const { data } = await api.delete(`/purchases/${purchaseId}`);
  return data;
}
