import { calculatePurchaseAmounts } from './purchaseMath.js';

function formatBill(bill) {
  if (!bill?.url) {
    return null;
  }

  return {
    originalName: bill.originalName,
    filename: bill.filename,
    mimeType: bill.mimeType,
    size: bill.size,
    url: bill.url,
  };
}

export function formatPurchase(purchase) {
  const itemName = purchase.itemName || purchase.product?.name || purchase.productName;
  const dueDate = purchase.dueDate ?? purchase.creditDueDate ?? null;
  const remarks = purchase.remarks ?? purchase.notes ?? '';

  const legacyAmounts = calculatePurchaseAmounts({
    quantity: purchase.quantity,
    purchasePrice: purchase.pricePerUnit ?? purchase.purchasePrice,
    gstType:
      purchase.gstType || (Number(purchase.gstRate ?? purchase.gst ?? 0) > 0 ? 'IGST' : 'None'),
    gstRate: purchase.gstRate ?? purchase.gst ?? 0,
    paymentType: purchase.paymentType,
    paidAmount: purchase.paidAmount,
  });

  const dueAmount = purchase.dueAmount ?? purchase.pendingAmount ?? legacyAmounts.dueAmount;

  return {
    id: purchase._id,

    supplier: {
      id: purchase.supplier?._id || purchase.supplier,
      name: purchase.supplier?.name || purchase.supplierName,
    },

    supplierName: purchase.supplier?.name || purchase.supplierName,
    supplierAddress: purchase.supplierAddress || '',
    supplierLocation: purchase.supplierLocation || '',
    gstNo: purchase.gstNo || '',

    product: {
      id: purchase.product?._id || purchase.product,
      name: purchase.product?.name || purchase.productName || itemName,
      currentStock: purchase.product?.currentStock,
    },

    // ✅ New Field
    purchaseType: purchase.purchaseType || 'Raw Material',

    itemName,
    unit: purchase.unit || null,

    purchaseDate: purchase.purchaseDate,
    recordedAt: purchase.recordedAt || purchase.createdAt || purchase.purchaseDate,

    quantity: purchase.quantity,

    purchasePrice: purchase.purchasePrice,
    pricePerUnit: purchase.pricePerUnit ?? purchase.purchasePrice,

    basicAmount: purchase.basicAmount ?? legacyAmounts.basicAmount,

    gstType: purchase.gstType || (legacyAmounts.gstAmount > 0 ? 'IGST' : 'None'),
    gstRate: purchase.gstRate ?? purchase.gst ?? 0,
    gstAmount: purchase.gstAmount ?? legacyAmounts.gstAmount,
    cgstAmount: purchase.cgstAmount ?? legacyAmounts.cgstAmount,
    sgstAmount: purchase.sgstAmount ?? legacyAmounts.sgstAmount,
    igstAmount: purchase.igstAmount ?? legacyAmounts.igstAmount,

    paymentType: purchase.paymentType,

    creditDueDate: dueDate,
    dueDate,

    bill: formatBill(purchase.bill),

    totalAmount: purchase.totalAmount ?? legacyAmounts.totalAmount,
    paidAmount: purchase.paidAmount ?? legacyAmounts.paidAmount,
    dueAmount,

    notes: remarks,
    remarks,

    // Existing stock response
    rawMaterialStock: purchase.rawMaterialStock || null,

    // ✅ Generic stock response (Raw Material or PU Chemical)
    purchaseStock: purchase.purchaseStock || purchase.rawMaterialStock || null,

    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  };
}