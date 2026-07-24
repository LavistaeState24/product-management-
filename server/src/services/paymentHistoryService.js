import mongoose from 'mongoose';
import CustomerReceivable from '../models/CustomerReceivable.js';
import PaymentHistory from '../models/PaymentHistory.js';
import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import SupplierPayable from '../models/SupplierPayable.js';
import { createHttpError } from '../utils/httpError.js';
import { roundCurrency as roundPurchaseCurrency } from '../utils/purchaseMath.js';
import { roundCurrency as roundSaleCurrency } from '../utils/saleMath.js';
import { syncSupplierOutstanding } from './purchaseService.js';
import { syncCustomerOutstandingInSession } from './salesService.js';

function parseDate(value, fallback = new Date()) {
  return value ? new Date(value) : fallback;
}

function parseText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildPurchaseInvoiceNumber(purchase) {
  return purchase.invoiceNumber || purchase.bill?.originalName || `PUR-${purchase._id}`;
}

export function resolvePaymentStatus({ outstandingAmount, paidAmount, dueDate }) {
  const normalizedOutstandingAmount = Number(outstandingAmount || 0);
  const normalizedPaidAmount = Number(paidAmount || 0);

  if (normalizedOutstandingAmount <= 0) {
    return 'Paid';
  }

  if (dueDate) {
    const dueDateValue = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!Number.isNaN(dueDateValue.getTime()) && dueDateValue < today) {
      return 'Overdue';
    }
  }

  if (normalizedPaidAmount > 0) {
    return 'Partially Paid';
  }

  return 'Pending';
}

export function getPurchasePaymentSnapshot(purchase) {
  const totalAmount = roundPurchaseCurrency(purchase.totalAmount || 0);
  const paidAmount = roundPurchaseCurrency(purchase.paidAmount || 0);
  const outstandingAmount = roundPurchaseCurrency(purchase.dueAmount ?? totalAmount - paidAmount);
  const dueDate = purchase.dueDate || purchase.creditDueDate || null;

  return {
    invoiceNumber: buildPurchaseInvoiceNumber(purchase),
    totalAmount,
    paidAmount,
    outstandingAmount,
    dueDate,
    paymentStatus: resolvePaymentStatus({ outstandingAmount, paidAmount, dueDate }),
  };
}

export function getSalePaymentSnapshot(sale) {
  const totalAmount = roundSaleCurrency(sale.totalAmount ?? sale.grandTotal ?? 0);
  const paidAmount = roundSaleCurrency(sale.paidAmount ?? sale.paid ?? 0);
  const outstandingAmount = roundSaleCurrency(
    sale.outstandingAmount ?? sale.outstanding ?? totalAmount - paidAmount,
  );
  const dueDate = sale.dueDate || null;

  return {
    invoiceNumber: sale.invoiceNumber,
    totalAmount,
    paidAmount,
    outstandingAmount,
    dueDate,
    paymentStatus: sale.invoiceStatus === 'Cancelled'
      ? 'Cancelled'
      : resolvePaymentStatus({ outstandingAmount, paidAmount, dueDate }),
  };
}

export function resolveReminderType(dueDate, now = new Date()) {
  if (!dueDate) {
    return null;
  }

  const dueDateValue = new Date(dueDate);

  if (Number.isNaN(dueDateValue.getTime())) {
    return null;
  }

  const dueDay = new Date(dueDateValue);
  const today = new Date(now);
  dueDay.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (dueDay.getTime() === today.getTime()) {
    return 'Due Today';
  }

  return dueDay < today ? 'Overdue' : 'Upcoming';
}

export function getPurchaseReminder(purchase, now = new Date()) {
  const snapshot = getPurchasePaymentSnapshot(purchase);

  if (snapshot.outstandingAmount <= 0 || snapshot.paymentStatus === 'Paid') {
    return null;
  }

  const reminderType = resolveReminderType(snapshot.dueDate, now);

  if (!reminderType) {
    return null;
  }

  return {
    id: purchase._id,
    purchaseId: purchase._id,
    supplier: {
      id: purchase.supplier?._id || purchase.supplier,
      name: purchase.supplier?.name || purchase.supplierName,
    },
    supplierName: purchase.supplier?.name || purchase.supplierName,
    invoiceNumber: snapshot.invoiceNumber,
    outstandingAmount: snapshot.outstandingAmount,
    dueDate: snapshot.dueDate,
    reminderType,
  };
}

export function getSaleReminder(sale, now = new Date()) {
  const snapshot = getSalePaymentSnapshot(sale);

  if (
    snapshot.outstandingAmount <= 0 ||
    snapshot.paymentStatus === 'Paid' ||
    snapshot.paymentStatus === 'Cancelled'
  ) {
    return null;
  }

  const reminderType = resolveReminderType(snapshot.dueDate, now);

  if (!reminderType) {
    return null;
  }

  return {
    id: sale._id,
    saleId: sale._id,
    customer: {
      id: sale.customer?._id || sale.customer,
      name: sale.customer?.name || sale.customerName,
    },
    customerName: sale.customer?.name || sale.customerName,
    invoiceNumber: snapshot.invoiceNumber,
    amountReceivable: snapshot.outstandingAmount,
    dueDate: snapshot.dueDate,
    reminderType,
  };
}

function assertCanAcceptPayment({ outstandingAmount, paymentStatus }) {
  if (paymentStatus === 'Paid' || outstandingAmount <= 0) {
    throw createHttpError(409, 'Fully paid invoice cannot accept payment.');
  }
}

function assertPaymentAmount({ amount, outstandingAmount }) {
  if (amount <= 0) {
    throw createHttpError(422, 'Payment amount must be greater than 0.');
  }

  if (amount > outstandingAmount) {
    throw createHttpError(422, 'Payment amount cannot exceed outstanding amount.');
  }
}

function buildPaymentHistoryPayload({
  referenceType,
  referenceId,
  invoiceNumber,
  payment,
  userId,
}) {
  return {
    referenceType,
    referenceId,
    invoiceNumber,
    paymentDate: parseDate(payment.paymentDate),
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    chequeNumber: payment.paymentMethod === 'Cheque' ? parseText(payment.chequeNumber) : '',
    chequeDate: payment.paymentMethod === 'Cheque' ? parseDate(payment.chequeDate, null) : null,
    bankName: payment.paymentMethod === 'Cheque' ? parseText(payment.bankName) : '',
    remarks: parseText(payment.remarks),
    recordedBy: userId,
  };
}

export function parsePaymentPayload(body) {
  return {
    amount: Number(body.amount),
    paymentDate: body.paymentDate,
    paymentMethod: body.paymentMethod || body.paymentType || 'Cash',
    chequeNumber: body.chequeNumber,
    chequeDate: body.chequeDate,
    bankName: body.bankName,
    remarks: body.remarks ?? body.notes,
  };
}

export async function runPaymentTransaction(work) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await work(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export async function recordPurchasePayment({ purchaseId, payment, userId }) {
  return runPaymentTransaction(async (session) => {
    const purchase = await Purchase.findById(purchaseId).session(session);

    if (!purchase) {
      throw createHttpError(404, 'Purchase not found.');
    }

    const snapshot = getPurchasePaymentSnapshot(purchase);
    const outstandingAmount = snapshot.outstandingAmount;
    assertCanAcceptPayment(snapshot);
    assertPaymentAmount({ amount: payment.amount, outstandingAmount });

    const nextPaidAmount = roundPurchaseCurrency(Number(purchase.paidAmount || 0) + payment.amount);
    const nextDueAmount = roundPurchaseCurrency(Number(purchase.totalAmount || 0) - nextPaidAmount);

    purchase.paidAmount = nextPaidAmount;
    purchase.dueAmount = nextDueAmount;
    purchase.updatedBy = userId;
    await purchase.save({ session });

    await SupplierPayable.findOneAndUpdate(
      { purchase: purchase._id },
      {
        supplier: purchase.supplier,
        purchase: purchase._id,
        amount: nextDueAmount,
        dueDate: purchase.dueDate || purchase.creditDueDate || new Date(),
        status: nextDueAmount > 0 ? 'pending' : 'settled',
      },
      {
        upsert: purchase.paymentType === 'Credit' || purchase.paymentType === 'Advance',
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        session,
      },
    );

    const [history] = await PaymentHistory.create(
      [
        buildPaymentHistoryPayload({
          referenceType: 'Purchase',
          referenceId: purchase._id,
          invoiceNumber: snapshot.invoiceNumber,
          payment,
          userId,
        }),
      ],
      { session },
    );

    await syncSupplierOutstanding(purchase.supplier, session);

    return { purchase, paymentHistory: history };
  });
}

export async function recordSalePayment({ saleId, payment, userId }) {
  return runPaymentTransaction(async (session) => {
    const sale = await Sale.findById(saleId).session(session);

    if (!sale) {
      throw createHttpError(404, 'Sale not found.');
    }

    if (sale.invoiceStatus === 'Cancelled') {
      throw createHttpError(409, 'Cancelled invoices cannot accept payment.');
    }

    const snapshot = getSalePaymentSnapshot(sale);
    const outstandingAmount = snapshot.outstandingAmount;
    assertCanAcceptPayment(snapshot);
    assertPaymentAmount({ amount: payment.amount, outstandingAmount });

    const nextPaidAmount = roundSaleCurrency(Number(sale.paidAmount || sale.paid || 0) + payment.amount);
    const nextOutstandingAmount = roundSaleCurrency(outstandingAmount - payment.amount);
    const nextStatus = nextOutstandingAmount === 0
      ? 'Paid'
      : nextPaidAmount > 0
        ? 'Partially Paid'
        : 'Unpaid';

    sale.paidAmount = nextPaidAmount;
    sale.paid = nextPaidAmount;
    sale.outstandingAmount = nextOutstandingAmount;
    sale.outstanding = nextOutstandingAmount;
    sale.invoiceStatus = nextStatus;
    sale.paymentStatus = nextStatus;
    sale.payments.push({
      amount: payment.amount,
      paymentDate: parseDate(payment.paymentDate),
      paymentType: payment.paymentMethod,
      notes: parseText(payment.remarks),
      createdBy: userId,
    });
    sale.updatedBy = userId;
    await sale.save({ session });

    await CustomerReceivable.findOneAndUpdate(
      { sale: sale._id },
      {
        customer: sale.customer,
        sale: sale._id,
        amount: nextOutstandingAmount,
        status: nextOutstandingAmount > 0 ? 'pending' : 'settled',
      },
      {
        upsert: sale.paymentType === 'Credit',
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        session,
      },
    );

    const [history] = await PaymentHistory.create(
      [
        buildPaymentHistoryPayload({
          referenceType: 'Sale',
          referenceId: sale._id,
          invoiceNumber: snapshot.invoiceNumber,
          payment,
          userId,
        }),
      ],
      { session },
    );

    await syncCustomerOutstandingInSession(sale.customer, session);

    return { sale, paymentHistory: history };
  });
}
