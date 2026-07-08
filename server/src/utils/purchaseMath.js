function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const PURCHASE_GST_TYPES = ['None', 'CGST_SGST', 'IGST'];
export const PURCHASE_GST_RATES = [0, 5, 12, 18, 28];
export const PURCHASE_PAYMENT_TYPES = ['Cash', 'Cheque', 'Credit', 'Advance'];

export function roundCurrency(value) {
  return Number(toNumber(value).toFixed(2));
}

export function calculatePurchaseAmounts({
  quantity,
  purchasePrice,
  gstType = 'None',
  gstRate = 0,
  paidAmount = 0,
  paymentType,
}) {
  const normalizedQuantity = roundCurrency(quantity);
  const normalizedPurchasePrice = roundCurrency(purchasePrice);
  const normalizedGstRate = roundCurrency(gstRate);
  const normalizedGstType = PURCHASE_GST_TYPES.includes(gstType) ? gstType : 'None';

  const basicAmount = roundCurrency(normalizedQuantity * normalizedPurchasePrice);
  const gstAmount =
    normalizedGstType === 'None' || normalizedGstRate === 0
      ? 0
      : roundCurrency((basicAmount * normalizedGstRate) / 100);

  const cgstAmount =
    normalizedGstType === 'CGST_SGST' ? roundCurrency(gstAmount / 2) : 0;
  const sgstAmount =
    normalizedGstType === 'CGST_SGST' ? roundCurrency(gstAmount - cgstAmount) : 0;
  const igstAmount = normalizedGstType === 'IGST' ? gstAmount : 0;
  const totalAmount = roundCurrency(basicAmount + gstAmount);

  if (paymentType === 'Cash' || paymentType === 'Cheque') {
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

  const normalizedPaidAmount = roundCurrency(paidAmount);

  return {
    basicAmount,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
    paidAmount: normalizedPaidAmount,
    dueAmount: roundCurrency(totalAmount - normalizedPaidAmount),
  };
}
