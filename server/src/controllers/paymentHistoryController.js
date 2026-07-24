import PaymentHistory from '../models/PaymentHistory.js';
import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import { formatPurchase } from '../utils/formatPurchase.js';
import { formatSale } from '../utils/formatSale.js';
import {
  getPurchaseReminder,
  getPurchasePaymentSnapshot,
  getSaleReminder,
  getSalePaymentSnapshot,
  parsePaymentPayload,
  recordPurchasePayment,
  recordSalePayment,
} from '../services/paymentHistoryService.js';

function formatPaymentHistory(paymentHistory) {
  return {
    id: paymentHistory._id,
    referenceType: paymentHistory.referenceType,
    referenceId: paymentHistory.referenceId,
    invoiceNumber: paymentHistory.invoiceNumber,
    paymentDate: paymentHistory.paymentDate,
    amount: paymentHistory.amount,
    paymentMethod: paymentHistory.paymentMethod,
    chequeNumber: paymentHistory.chequeNumber || '',
    chequeDate: paymentHistory.chequeDate || null,
    bankName: paymentHistory.bankName || '',
    remarks: paymentHistory.remarks || '',
    recordedBy: paymentHistory.recordedBy,
    createdAt: paymentHistory.createdAt,
    updatedAt: paymentHistory.updatedAt,
  };
}

export async function listPaymentHistory(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const filter = {};

  if (req.query.referenceType) {
    filter.referenceType = req.query.referenceType;
  }

  if (req.query.referenceId) {
    filter.referenceId = req.query.referenceId;
  }

  if (req.query.invoiceNumber) {
    filter.invoiceNumber = new RegExp(req.query.invoiceNumber.trim(), 'i');
  }

  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    PaymentHistory.find(filter)
      .populate('recordedBy', 'name email role')
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PaymentHistory.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatPaymentHistory),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  });
}

export async function listPaymentManagementPurchases(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const filter = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { supplierName: regex },
      { 'bill.originalName': regex },
      { remarks: regex },
      { notes: regex },
    ];
  }

  const skip = (page - 1) * limit;
  const [purchases, totalItems] = await Promise.all([
    Purchase.find(filter)
      .populate('supplier')
      .sort({ dueDate: 1, purchaseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Purchase.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: purchases.map((purchase) => {
      const snapshot = getPurchasePaymentSnapshot(purchase);

      return {
        id: purchase._id,
        purchaseId: purchase._id,
        supplier: {
          id: purchase.supplier?._id || purchase.supplier,
          name: purchase.supplier?.name || purchase.supplierName,
        },
        supplierName: purchase.supplier?.name || purchase.supplierName,
        invoiceNumber: snapshot.invoiceNumber,
        totalAmount: snapshot.totalAmount,
        paidAmount: snapshot.paidAmount,
        outstandingAmount: snapshot.outstandingAmount,
        dueDate: snapshot.dueDate,
        paymentStatus: snapshot.paymentStatus,
      };
    }),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  });
}

export async function listPaymentManagementCustomers(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const filter = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { customerName: regex },
      { invoiceNumber: regex },
      { customerMobile: regex },
      { remarks: regex },
      { notes: regex },
    ];
  }

  const skip = (page - 1) * limit;
  const [sales, totalItems] = await Promise.all([
    Sale.find(filter)
      .populate('customer')
      .sort({ dueDate: 1, invoiceDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Sale.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: sales.map((sale) => {
      const snapshot = getSalePaymentSnapshot(sale);

      return {
        id: sale._id,
        saleId: sale._id,
        customer: {
          id: sale.customer?._id || sale.customer,
          name: sale.customer?.name || sale.customerName,
        },
        customerName: sale.customer?.name || sale.customerName,
        invoiceNumber: snapshot.invoiceNumber,
        totalAmount: snapshot.totalAmount,
        receivedAmount: snapshot.paidAmount,
        amountReceivable: snapshot.outstandingAmount,
        dueDate: snapshot.dueDate,
        paymentStatus: snapshot.paymentStatus,
      };
    }),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  });
}

export async function listPaymentReminders(req, res) {
  const [purchases, sales] = await Promise.all([
    Purchase.find({
      dueAmount: { $gt: 0 },
      dueDate: { $ne: null },
    })
      .populate('supplier')
      .sort({ dueDate: 1, purchaseDate: -1, createdAt: -1 })
      .lean(),
    Sale.find({
      outstandingAmount: { $gt: 0 },
      dueDate: { $ne: null },
      invoiceStatus: { $ne: 'Cancelled' },
      paymentStatus: { $ne: 'Paid' },
    })
      .populate('customer')
      .sort({ dueDate: 1, invoiceDate: -1, createdAt: -1 })
      .lean(),
  ]);

  const supplierReminders = purchases
    .map((purchase) => getPurchaseReminder(purchase))
    .filter(Boolean);
  const customerReminders = sales
    .map((sale) => getSaleReminder(sale))
    .filter(Boolean);

  return res.status(200).json({
    supplierReminders,
    customerReminders,
    items: [
      ...supplierReminders.map((reminder) => ({
        ...reminder,
        referenceType: 'Purchase',
      })),
      ...customerReminders.map((reminder) => ({
        ...reminder,
        referenceType: 'Sale',
      })),
    ],
  });
}

export async function listPurchasePayments(req, res) {
  const items = await PaymentHistory.find({
    referenceType: 'Purchase',
    referenceId: req.params.purchaseId,
  })
    .populate('recordedBy', 'name email role')
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean();

  return res.status(200).json({
    items: items.map(formatPaymentHistory),
  });
}

export async function listSalePayments(req, res) {
  const items = await PaymentHistory.find({
    referenceType: 'Sale',
    referenceId: req.params.saleId,
  })
    .populate('recordedBy', 'name email role')
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean();

  return res.status(200).json({
    items: items.map(formatPaymentHistory),
  });
}

export async function recordPurchasePaymentController(req, res) {
  const { purchase, paymentHistory } = await recordPurchasePayment({
    purchaseId: req.params.purchaseId,
    payment: parsePaymentPayload(req.body),
    userId: req.user._id,
  });

  const populatedPurchase = await Purchase.findById(purchase._id)
    .populate('supplier')
    .populate('product');

  return res.status(200).json({
    message: 'Payment recorded successfully.',
    purchase: formatPurchase(populatedPurchase),
    paymentHistory: formatPaymentHistory(paymentHistory),
  });
}

export async function recordSalePaymentController(req, res) {
  const { sale, paymentHistory } = await recordSalePayment({
    saleId: req.params.saleId,
    payment: parsePaymentPayload(req.body),
    userId: req.user._id,
  });

  const populatedSale = await Sale.findById(sale._id)
    .populate('customer')
    .populate('product');

  return res.status(200).json({
    message: 'Payment recorded successfully.',
    sale: formatSale(populatedSale),
    paymentHistory: formatPaymentHistory(paymentHistory),
  });
}
