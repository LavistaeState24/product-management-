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

function roundCurrency(value) {
  return Number((Number(value) || 0).toFixed(2));
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

export function calculateSalePreview({
  quantity,
  sellingPrice,
  paymentType,
  paidAmount,
}) {
  const safeQuantity = roundCurrency(quantity);
  const safeSellingPrice = roundCurrency(sellingPrice);
  const totalAmount = roundCurrency(safeQuantity * safeSellingPrice);

  if (paymentType === 'Cash') {
    return {
      totalAmount,
      paidAmount: totalAmount,
      outstandingAmount: 0,
      invoiceStatus: 'Paid',
    };
  }

  const safePaidAmount = roundCurrency(paidAmount);
  const outstandingAmount = roundCurrency(Math.max(totalAmount - safePaidAmount, 0));

  return {
    totalAmount,
    paidAmount: safePaidAmount,
    outstandingAmount,
    invoiceStatus: resolveInvoiceStatus({
      paymentType,
      paidAmount: safePaidAmount,
      outstandingAmount,
    }),
  };
}

export function getPaymentBadgeVariant(paymentType) {
  return paymentType === 'Cash' ? 'success' : 'warning';
}

export function getInvoiceStatusBadgeVariant(invoiceStatus) {
  if (invoiceStatus === 'Paid') {
    return 'success';
  }

  if (invoiceStatus === 'Partially Paid') {
    return 'warning';
  }

  return 'danger';
}
