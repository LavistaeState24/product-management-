function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const SALE_PAYMENT_TYPES = ['Cash', 'Credit'];
export const SALE_INVOICE_STATUSES = ['Paid', 'Partially Paid', 'Unpaid', 'Cancelled'];
export const SALE_STOCK_TYPES = ['rod', 'sheet', 'pu-product', 'legacy-product'];

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

export function calculatePaymentStatus({ paidAmount, outstandingAmount, cancelled = false }) {
  if (cancelled) {
    return 'Cancelled';
  }

  if (outstandingAmount === 0) {
    return 'Paid';
  }

  if (paidAmount > 0) {
    return 'Partially Paid';
  }

  return 'Unpaid';
}

export function calculateSaleLine({ quantity, sellingPrice, gstRate = 0 }) {
  const normalizedQuantity = roundCurrency(quantity);
  const normalizedSellingPrice = roundCurrency(sellingPrice);
  const normalizedGstRate = roundCurrency(gstRate);
  const lineSubtotal = roundCurrency(normalizedQuantity * normalizedSellingPrice);
  const gstAmount = roundCurrency((lineSubtotal * normalizedGstRate) / 100);

  return {
    quantity: normalizedQuantity,
    sellingPrice: normalizedSellingPrice,
    gstRate: normalizedGstRate,
    lineSubtotal,
    gstAmount,
    lineTotal: roundCurrency(lineSubtotal + gstAmount),
  };
}

export function calculateDueDate(invoiceDate, creditDays = 0) {
  const normalizedCreditDays = Math.max(0, Math.trunc(toNumber(creditDays)));

  if (!normalizedCreditDays) {
    return null;
  }

  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + normalizedCreditDays);
  return dueDate;
}

export function calculateSaleInvoice({
  items = [],
  paidAmount = 0,
  paymentType,
  invoiceDate,
  creditDays = 0,
  freightCharges = 0,
  roundOff = 0,
  cancelled = false,
}) {
  const calculatedItems = items.map((item) => ({
    ...item,
    ...calculateSaleLine(item),
  }));
  const subtotal = roundCurrency(
    calculatedItems.reduce((total, item) => total + item.lineSubtotal, 0),
  );
  const gstAmount = roundCurrency(
    calculatedItems.reduce((total, item) => total + item.gstAmount, 0),
  );
  const normalizedFreightCharges = Math.max(roundCurrency(freightCharges), 0);
  const normalizedRoundOff = roundCurrency(roundOff);
  const grandTotal = roundCurrency(
    subtotal + gstAmount + normalizedFreightCharges + normalizedRoundOff,
  );
  const normalizedPaidAmount = paymentType === 'Cash'
    ? grandTotal
    : roundCurrency(paidAmount);
  const outstandingAmount = cancelled
    ? 0
    : roundCurrency(grandTotal - normalizedPaidAmount);
  const paymentStatus = calculatePaymentStatus({
    paidAmount: normalizedPaidAmount,
    outstandingAmount,
    cancelled,
  });

  return {
    items: calculatedItems,
    subtotal,
    gstAmount,
    freightCharges: normalizedFreightCharges,
    roundOff: normalizedRoundOff,
    grandTotal,
    totalAmount: grandTotal,
    paidAmount: normalizedPaidAmount,
    paid: normalizedPaidAmount,
    outstandingAmount,
    outstanding: outstandingAmount,
    dueDate: paymentType === 'Credit' ? calculateDueDate(invoiceDate, creditDays) : null,
    paymentStatus,
    invoiceStatus: cancelled
      ? 'Cancelled'
      : resolveInvoiceStatus({
          paymentType,
          paidAmount: normalizedPaidAmount,
          outstandingAmount,
        }),
  };
}

export function calculateSaleAmounts({
  quantity,
  sellingPrice,
  paidAmount = 0,
  paymentType,
}) {
  if (Array.isArray(quantity)) {
    return calculateSaleInvoice({
      items: quantity,
      paidAmount,
      paymentType,
    });
  }

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
