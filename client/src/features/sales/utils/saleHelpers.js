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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function toDateInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function roundCurrency(value) {
  return Number((Number(value) || 0).toFixed(2));
}

export function resolveInvoiceStatus({
  paymentType,
  paidAmount,
  outstandingAmount,
}) {
  const safePaidAmount = roundCurrency(paidAmount);
  const safeOutstandingAmount = roundCurrency(outstandingAmount);

  if (
    paymentType === 'Cash' ||
    safeOutstandingAmount <= 0
  ) {
    return 'Paid';
  }

  if (safePaidAmount > 0) {
    return 'Partially Paid';
  }

  return 'Unpaid';
}

export function calculateSalePreview({
  quantity,
  sellingPrice,
  gstRate = 0,
  paymentType,
  paidAmount,
}) {
  const safeQuantity = Math.max(Number(quantity) || 0, 0);
  const safeSellingPrice = Math.max(Number(sellingPrice) || 0, 0);
  const safeGstRate = Math.max(Number(gstRate) || 0, 0);

  const subtotal = roundCurrency(
    safeQuantity * safeSellingPrice,
  );

  const gstAmount = roundCurrency(
    subtotal * (safeGstRate / 100),
  );

  const totalAmount = roundCurrency(
    subtotal + gstAmount,
  );

  if (paymentType === 'Cash') {
    return {
      subtotal,
      gstRate: safeGstRate,
      gstAmount,
      totalAmount,
      paidAmount: totalAmount,
      outstandingAmount: 0,
      invoiceStatus: 'Paid',
    };
  }

  const enteredPaidAmount = Math.max(
    Number(paidAmount) || 0,
    0,
  );

  const safePaidAmount = roundCurrency(
    Math.min(enteredPaidAmount, totalAmount),
  );

  const outstandingAmount = roundCurrency(
    Math.max(totalAmount - safePaidAmount, 0),
  );

  return {
    subtotal,
    gstRate: safeGstRate,
    gstAmount,
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