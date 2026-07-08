function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const SALE_PAYMENT_TYPES = ['Cash', 'Credit'];
export const SALE_INVOICE_STATUSES = ['Paid', 'Partially Paid', 'Unpaid'];

export function roundCurrency(value) {
  return Number(toNumber(value).toFixed(2));
}

export function resolveInvoiceStatus({ paymentType, paidAmount, outstandingAmount }) {
  if (paymentType === 'Cash' || outstandingAmount === 0) {
    return 'Paid';
  }

  if (paidAmount > 0) {
    return 'Partially Paid';
  }

  return 'Unpaid';
}

export function calculateSaleAmounts({
  quantity,
  sellingPrice,
  paidAmount = 0,
  paymentType,
}) {
  const normalizedQuantity = roundCurrency(quantity);
  const normalizedSellingPrice = roundCurrency(sellingPrice);
  const totalAmount = roundCurrency(normalizedQuantity * normalizedSellingPrice);

  if (paymentType === 'Cash') {
    return {
      totalAmount,
      paidAmount: totalAmount,
      outstandingAmount: 0,
      invoiceStatus: 'Paid',
    };
  }

  const normalizedPaidAmount = roundCurrency(paidAmount);
  const outstandingAmount = roundCurrency(totalAmount - normalizedPaidAmount);

  return {
    totalAmount,
    paidAmount: normalizedPaidAmount,
    outstandingAmount,
    invoiceStatus: resolveInvoiceStatus({
      paymentType,
      paidAmount: normalizedPaidAmount,
      outstandingAmount,
    }),
  };
}
