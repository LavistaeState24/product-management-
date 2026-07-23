import { calculateSaleAmounts, calculateSaleInvoice } from './saleMath.js';

function formatSaleItems(sale) {
  if (Array.isArray(sale.items) && sale.items.length) {
    return sale.items.map((item) => ({
      id: item._id,
      stockType: item.stockType,
      stockRef: item.stockRef,
      itemNumber: item.itemNumber,
      productName: item.productName,
      size: item.size,
      colour: item.colour,
      weight: item.weight,
      sellingUnit: item.sellingUnit,
      quantity: item.quantity,
      sellingPrice: item.sellingPrice,
      gstRate: item.gstRate,
      lineSubtotal: item.lineSubtotal,
      gstAmount: item.gstAmount,
      lineTotal: item.lineTotal,
    }));
  }

  return [
    {
      stockType: 'legacy-product',
      stockRef: sale.product?._id || sale.product,
      itemNumber: '',
      productName: sale.product?.name || sale.productName,
      size: '',
      colour: '',
      weight: null,
      sellingUnit: '',
      quantity: sale.quantity,
      sellingPrice: sale.sellingPrice,
      gstRate: 0,
      lineSubtotal: sale.totalAmount,
      gstAmount: 0,
      lineTotal: sale.totalAmount,
    },
  ];
}

export function formatSale(sale) {
  const items = formatSaleItems(sale);
  const invoiceAmounts = calculateSaleInvoice({
    items,
    paidAmount: sale.paidAmount,
    paymentType: sale.paymentType,
    invoiceDate: sale.invoiceDate,
    creditDays: sale.creditDays,
    cancelled: sale.invoiceStatus === 'Cancelled',
  });
  const fallbackAmounts = calculateSaleAmounts({
    quantity: sale.quantity,
    sellingPrice: sale.sellingPrice,
    paidAmount: sale.paidAmount,
    paymentType: sale.paymentType,
  });
  const totalAmount = sale.totalAmount ?? sale.grandTotal ?? invoiceAmounts.grandTotal ?? fallbackAmounts.totalAmount;
  const paidAmount = sale.paidAmount ?? sale.paid ?? invoiceAmounts.paidAmount ?? fallbackAmounts.paidAmount;
  const outstandingAmount =
    sale.outstandingAmount ?? sale.outstanding ?? invoiceAmounts.outstandingAmount ?? fallbackAmounts.outstandingAmount;

  return {
    id: sale._id,
    customer: {
      id: sale.customer?._id || sale.customer,
      name: sale.customer?.name || sale.customerName,
      outstandingReceivable: sale.customer?.outstandingReceivable,
    },
    customerName: sale.customerName,
    customerMobile: sale.customerMobile || '',
    customerAddress: sale.customerAddress || '',
    customerLocation: sale.customerLocation || '',
    customerGST: sale.customerGST || '',
    product: {
      id: sale.product?._id || sale.product,
      name: sale.product?.name || sale.productName,
      currentStock: sale.product?.currentStock,
    },
    invoiceNumber: sale.invoiceNumber,
    invoiceDate: sale.invoiceDate,
    quantity: sale.quantity,
    sellingPrice: sale.sellingPrice,
    paymentType: sale.paymentType,
    totalAmount,
    paidAmount,
    outstandingAmount,
    invoiceStatus: sale.invoiceStatus || fallbackAmounts.invoiceStatus,
    partyDetails: sale.partyDetails || {},
    gstDetails: sale.gstDetails || {},
    paymentDetails: sale.paymentDetails || {},
    transportDetails: sale.transportDetails || {},
    transportName: sale.transportName || '',
    vehicleNumber: sale.vehicleNumber || '',
    bankDetails: sale.bankDetails || {},
    termsAndConditions: sale.termsAndConditions || [],
    remarks: sale.remarks || '',
    subtotal: sale.subtotal ?? invoiceAmounts.subtotal,
    gstAmount: sale.gstAmount ?? invoiceAmounts.gstAmount,
    grandTotal: sale.grandTotal ?? totalAmount,
    paid: sale.paid ?? paidAmount,
    outstanding: sale.outstanding ?? outstandingAmount,
    dueDate: sale.dueDate || invoiceAmounts.dueDate,
    creditDays: sale.creditDays || 0,
    parcelCount: sale.parcelCount || 0,
    paymentStatus: sale.paymentStatus || sale.invoiceStatus || fallbackAmounts.invoiceStatus,
    items,
    payments: sale.payments || [],
    cancellationDetails: sale.cancellationDetails || null,
    confirmedBy: sale.confirmedBy || null,
    confirmedAt: sale.confirmedAt || null,
    cancelledBy: sale.cancelledBy || sale.cancellationDetails?.cancelledBy || null,
    cancelledAt: sale.cancelledAt || sale.cancellationDetails?.cancelledAt || null,
    cancellationReason: sale.cancellationReason || sale.cancellationDetails?.reason || '',
    notes: sale.notes,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}
