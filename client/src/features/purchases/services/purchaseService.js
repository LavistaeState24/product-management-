import api from '@/services/api';

function appendField(formData, key, value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return;
  }

  formData.append(key, String(value));
}

function buildPurchaseFormData(values) {
  const formData = new FormData();

  const itemName =
    values.itemName ??
    values.productName;

  const pricePerUnit =
    values.pricePerUnit ??
    values.purchasePrice;

  const dueDate =
    values.dueDate ??
    values.creditDueDate;

  const remarks =
    values.remarks ??
    values.notes;

  appendField(
    formData,
    'supplierName',
    values.supplierName,
  );

  appendField(
    formData,
    'supplierAddress',
    values.supplierAddress,
  );

  appendField(
    formData,
    'supplierLocation',
    values.supplierLocation,
  );

  appendField(
    formData,
    'gstNo',
    values.gstNo,
  );

  appendField(
    formData,
    'purchaseType',
    values.purchaseType,
  );

  appendField(
    formData,
    'itemName',
    itemName,
  );

  appendField(
    formData,
    'productName',
    itemName,
  );

  appendField(
    formData,
    'unit',
    values.unit,
  );

  appendField(
    formData,
    'purchaseDate',
    values.purchaseDate,
  );

  appendField(
    formData,
    'quantity',
    values.quantity,
  );

  appendField(
    formData,
    'pricePerUnit',
    pricePerUnit,
  );

  appendField(
    formData,
    'purchasePrice',
    pricePerUnit,
  );

  appendField(
    formData,
    'gstType',
    values.gstType,
  );

  appendField(
    formData,
    'gstRate',
    values.gstRate,
  );

  appendField(
    formData,
    'paymentType',
    values.paymentType,
  );

  appendField(
    formData,
    'dueDate',
    dueDate,
  );

  appendField(
    formData,
    'creditDueDate',
    dueDate,
  );

  appendField(
    formData,
    'paidAmount',
    values.paidAmount,
  );

  appendField(
    formData,
    'remarks',
    remarks,
  );

  appendField(
    formData,
    'notes',
    remarks,
  );

  /*
   * Always send removeBill during updates so the backend
   * receives an explicit true/false value.
   */
  formData.append(
    'removeBill',
    values.removeBill ? 'true' : 'false',
  );

  /*
   * Supports either:
   * billUpload: File
   * or billUpload: FileList
   */
  const billFile =
    values.billUpload instanceof File
      ? values.billUpload
      : values.billUpload?.[0];

  if (billFile instanceof File) {
    formData.append(
      'billUpload',
      billFile,
    );
  }

  return formData;
}

export async function fetchPurchases(params) {
  const { data } = await api.get(
    '/purchases',
    {
      params,
    },
  );

  return data;
}

export async function fetchPurchaseFormOptions() {
  const { data } = await api.get(
    '/purchases/form-options',
  );

  return data;
}

export async function fetchPurchaseById(
  purchaseId,
) {
  const { data } = await api.get(
    `/purchases/${purchaseId}`,
  );

  return data;
}

/**
 * Get a temporary signed S3 URL
 * for viewing a private purchase bill.
 */
export async function getPurchaseBillUrl(
  purchaseId,
) {
  const { data } = await api.get(
    `/purchases/${purchaseId}/bill`,
  );

  return data;
}

export async function createPurchase(values) {
  const formData =
    buildPurchaseFormData(values);

  const { data } = await api.post(
    '/purchases',
    formData,
  );

  return data;
}

export async function updatePurchase(
  purchaseId,
  values,
) {
  const formData =
    buildPurchaseFormData(values);

  const { data } = await api.put(
    `/purchases/${purchaseId}`,
    formData,
  );

  return data;
}

export async function deletePurchase(
  purchaseId,
) {
  const { data } = await api.delete(
    `/purchases/${purchaseId}`,
  );

  return data;
}