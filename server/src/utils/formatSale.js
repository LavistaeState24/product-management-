import { calculateSaleAmounts } from './saleMath.js';

export function formatSale(sale) {
  const fallbackAmounts = calculateSaleAmounts({
    quantity: sale.quantity,
    sellingPrice: sale.sellingPrice,
    paidAmount: sale.paidAmount,
    paymentType: sale.paymentType,
  });

  return {
    id: sale._id,
    customer: {
      id: sale.customer?._id || sale.customer,
      name: sale.customer?.name || sale.customerName,
      outstandingReceivable: sale.customer?.outstandingReceivable,
    },
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
    totalAmount: sale.totalAmount ?? fallbackAmounts.totalAmount,
    paidAmount: sale.paidAmount ?? fallbackAmounts.paidAmount,
    outstandingAmount: sale.outstandingAmount ?? fallbackAmounts.outstandingAmount,
    invoiceStatus: sale.invoiceStatus || fallbackAmounts.invoiceStatus,
    notes: sale.notes,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}
