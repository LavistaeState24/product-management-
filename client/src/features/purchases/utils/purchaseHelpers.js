import { API_BASE_URL } from '@/config/env';

export const PURCHASE_GST_TYPE_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'CGST_SGST', label: 'CGST + SGST' },
  { value: 'IGST', label: 'IGST' },
];

export const PURCHASE_GST_RATE_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '12', label: '12%' },
  { value: '18', label: '18%' },
  { value: '28', label: '28%' },
];

function roundCurrency(value) {
  return Number((Number(value) || 0).toFixed(2));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function toDateInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculatePurchasePreview({
  quantity,
  purchasePrice,
  gstType,
  gstRate,
  paymentType,
  paidAmount,
}) {
  const safeQuantity = roundCurrency(quantity);
  const safePurchasePrice = roundCurrency(purchasePrice);
  const safeGstRate = roundCurrency(gstRate);
  const basicAmount = roundCurrency(safeQuantity * safePurchasePrice);
  const shouldApplyGst = gstType !== 'None' && safeGstRate > 0;
  const gstAmount = shouldApplyGst ? roundCurrency((basicAmount * safeGstRate) / 100) : 0;
  const cgstAmount = gstType === 'CGST_SGST' ? roundCurrency(gstAmount / 2) : 0;
  const sgstAmount = gstType === 'CGST_SGST' ? roundCurrency(gstAmount - cgstAmount) : 0;
  const igstAmount = gstType === 'IGST' ? gstAmount : 0;
  const totalAmount = roundCurrency(basicAmount + gstAmount);

  if (paymentType === 'Cash') {
    return {
      basicAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount,
      paidAmount: totalAmount,
      dueAmount: 0,
    };
  }

  const safePaidAmount = roundCurrency(paidAmount);
  return {
    basicAmount,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
    paidAmount: safePaidAmount,
    dueAmount: roundCurrency(Math.max(totalAmount - safePaidAmount, 0)),
  };
}

export function formatGstTypeLabel(gstType) {
  const match = PURCHASE_GST_TYPE_OPTIONS.find((option) => option.value === gstType);
  return match?.label || gstType || 'None';
}

export function getPaymentBadgeVariant(paymentType, dueAmount) {
  if (paymentType === 'Cash') {
    return 'success';
  }

  return dueAmount > 0 ? 'warning' : 'info';
}

export function resolveAssetUrl(relativeUrl) {
  if (!relativeUrl) {
    return null;
  }

  return new URL(relativeUrl, API_BASE_URL).toString();
}
