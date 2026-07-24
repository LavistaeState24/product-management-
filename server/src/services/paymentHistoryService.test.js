import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import CustomerReceivable from '../models/CustomerReceivable.js';
import PaymentHistory from '../models/PaymentHistory.js';
import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import Supplier from '../models/Supplier.js';
import SupplierPayable from '../models/SupplierPayable.js';
import {
  getPurchaseReminder,
  getSaleReminder,
  recordPurchasePayment,
  recordSalePayment,
  resolveReminderType,
  resolvePaymentStatus,
} from './paymentHistoryService.js';

const supplierId = '64f000000000000000000001';
const customerId = '64f000000000000000000002';
const userId = '64f000000000000000000003';

function createAggregateResult(result) {
  return {
    session() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
}

async function withMocks(mocks, run) {
  const originals = new Map();

  for (const [target, methods] of mocks) {
    for (const [method, replacement] of Object.entries(methods)) {
      originals.set(`${target.modelName || 'mongoose'}.${method}`, {
        target,
        method,
        value: target[method],
      });
      target[method] = replacement;
    }
  }

  try {
    await run();
  } finally {
    for (const { target, method, value } of originals.values()) {
      target[method] = value;
    }
  }
}

function createSessionMock(calls) {
  return {
    async withTransaction(work) {
      calls.transactions += 1;
      return work();
    },
    async endSession() {
      calls.sessionsEnded += 1;
    },
  };
}

test('resolvePaymentStatus returns Pending, Partially Paid, Paid, and Overdue', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  assert.equal(resolvePaymentStatus({ outstandingAmount: 100, paidAmount: 0 }), 'Pending');
  assert.equal(resolvePaymentStatus({ outstandingAmount: 50, paidAmount: 50 }), 'Partially Paid');
  assert.equal(resolvePaymentStatus({ outstandingAmount: 0, paidAmount: 100 }), 'Paid');
  assert.equal(
    resolvePaymentStatus({ outstandingAmount: 100, paidAmount: 0, dueDate: yesterday }),
    'Overdue',
  );
});

test('resolveReminderType returns Upcoming, Due Today, and Overdue', () => {
  const now = new Date('2026-07-24T10:00:00.000Z');

  assert.equal(resolveReminderType('2026-07-25T00:00:00.000Z', now), 'Upcoming');
  assert.equal(resolveReminderType('2026-07-24T00:00:00.000Z', now), 'Due Today');
  assert.equal(resolveReminderType('2026-07-23T00:00:00.000Z', now), 'Overdue');
});

test('recordPurchasePayment records a partial cash payment inside a transaction', async () => {
  const calls = {
    transactions: 0,
    sessionsEnded: 0,
    historyCreated: false,
    payableSynced: false,
    supplierSynced: false,
  };
  const purchase = {
    _id: '64f000000000000000000011',
    supplier: supplierId,
    totalAmount: 1000,
    paidAmount: 200,
    dueAmount: 800,
    dueDate: new Date('2026-08-01T00:00:00.000Z'),
    paymentType: 'Credit',
    bill: { originalName: 'PUR-100' },
    async save() {},
  };

  await withMocks(
    [
      [mongoose, { startSession: async () => createSessionMock(calls) }],
      [Purchase, { findById: () => ({ session: async () => purchase }) }],
      [
        SupplierPayable,
        {
          findOneAndUpdate: async (filter, update) => {
            calls.payableSynced = true;
            assert.equal(filter.purchase, purchase._id);
            assert.equal(update.amount, 600);
            assert.equal(update.status, 'pending');
          },
          aggregate: () => createAggregateResult([{ total: 600 }]),
        },
      ],
      [
        Supplier,
        {
          findByIdAndUpdate: async (supplierId, update) => {
            calls.supplierSynced = true;
            assert.equal(String(supplierId), purchase.supplier);
            assert.equal(update.outstandingPayable, 600);
          },
        },
      ],
      [
        PaymentHistory,
        {
          create: async ([history]) => {
            calls.historyCreated = true;
            assert.equal(history.referenceType, 'Purchase');
            assert.equal(history.amount, 200);
            assert.equal(history.paymentMethod, 'Cash');
            return [{ _id: 'history-1', ...history }];
          },
        },
      ],
    ],
    async () => {
      await recordPurchasePayment({
        purchaseId: purchase._id,
        payment: { amount: 200, paymentMethod: 'Cash' },
        userId,
      });
    },
  );

  assert.equal(purchase.paidAmount, 400);
  assert.equal(purchase.dueAmount, 600);
  assert.equal(calls.transactions, 1);
  assert.equal(calls.sessionsEnded, 1);
  assert.equal(calls.historyCreated, true);
  assert.equal(calls.payableSynced, true);
  assert.equal(calls.supplierSynced, true);
});

test('recordPurchasePayment removes purchase reminder when final payment is recorded', async () => {
  const calls = {
    transactions: 0,
    sessionsEnded: 0,
  };
  const purchase = {
    _id: '64f000000000000000000013',
    supplier: supplierId,
    supplierName: 'Test Supplier',
    totalAmount: 1000,
    paidAmount: 600,
    dueAmount: 400,
    dueDate: new Date('2026-07-24T00:00:00.000Z'),
    paymentType: 'Credit',
    bill: { originalName: 'PUR-102' },
    async save() {},
  };

  assert.equal(
    getPurchaseReminder(purchase, new Date('2026-07-24T10:00:00.000Z')).reminderType,
    'Due Today',
  );

  await withMocks(
    [
      [mongoose, { startSession: async () => createSessionMock(calls) }],
      [Purchase, { findById: () => ({ session: async () => purchase }) }],
      [
        SupplierPayable,
        {
          findOneAndUpdate: async (filter, update) => {
            assert.equal(filter.purchase, purchase._id);
            assert.equal(update.amount, 0);
            assert.equal(update.status, 'settled');
          },
          aggregate: () => createAggregateResult([{ total: 0 }]),
        },
      ],
      [Supplier, { findByIdAndUpdate: async () => {} }],
      [PaymentHistory, { create: async ([history]) => [{ _id: 'history-3', ...history }] }],
    ],
    async () => {
      await recordPurchasePayment({
        purchaseId: purchase._id,
        payment: { amount: 400, paymentMethod: 'Cash' },
        userId,
      });
    },
  );

  assert.equal(purchase.paidAmount, 1000);
  assert.equal(purchase.dueAmount, 0);
  assert.equal(getPurchaseReminder(purchase, new Date('2026-07-24T10:00:00.000Z')), null);
});

test('recordSalePayment records a final cheque payment and syncs CustomerReceivable', async () => {
  const calls = {
    transactions: 0,
    sessionsEnded: 0,
    historyCreated: false,
    receivableSynced: false,
    customerSynced: false,
  };
  const sale = {
    _id: '64f000000000000000000021',
    customer: customerId,
    invoiceNumber: 'SAL-100',
    totalAmount: 1000,
    paidAmount: 600,
    outstandingAmount: 400,
    dueDate: new Date('2026-08-01T00:00:00.000Z'),
    paymentType: 'Credit',
    invoiceStatus: 'Partially Paid',
    paymentStatus: 'Partially Paid',
    payments: [],
    async save() {},
  };

  await withMocks(
    [
      [mongoose, { startSession: async () => createSessionMock(calls) }],
      [Sale, { findById: () => ({ session: async () => sale }) }],
      [
        CustomerReceivable,
        {
          findOneAndUpdate: async (filter, update, options) => {
            calls.receivableSynced = true;
            assert.equal(filter.sale, sale._id);
            assert.equal(update.amount, 0);
            assert.equal(update.status, 'settled');
            assert.equal(options.upsert, true);
          },
          aggregate: () => createAggregateResult([{ total: 0 }]),
        },
      ],
      [
        Customer,
        {
          findByIdAndUpdate: async (customerId, update) => {
            calls.customerSynced = true;
            assert.equal(String(customerId), sale.customer);
            assert.equal(update.outstandingReceivable, 0);
          },
        },
      ],
      [
        PaymentHistory,
        {
          create: async ([history]) => {
            calls.historyCreated = true;
            assert.equal(history.referenceType, 'Sale');
            assert.equal(history.amount, 400);
            assert.equal(history.paymentMethod, 'Cheque');
            assert.equal(history.chequeNumber, 'CHQ-1');
            assert.equal(history.bankName, 'Test Bank');
            return [{ _id: 'history-2', ...history }];
          },
        },
      ],
    ],
    async () => {
      await recordSalePayment({
        saleId: sale._id,
        payment: {
          amount: 400,
          paymentMethod: 'Cheque',
          chequeNumber: 'CHQ-1',
          chequeDate: '2026-08-02',
          bankName: 'Test Bank',
        },
        userId,
      });
    },
  );

  assert.equal(sale.paidAmount, 1000);
  assert.equal(sale.outstandingAmount, 0);
  assert.equal(sale.paymentStatus, 'Paid');
  assert.equal(sale.payments.length, 1);
  assert.equal(calls.transactions, 1);
  assert.equal(calls.sessionsEnded, 1);
  assert.equal(calls.historyCreated, true);
  assert.equal(calls.receivableSynced, true);
  assert.equal(calls.customerSynced, true);
  assert.equal(getSaleReminder(sale, new Date('2026-07-24T10:00:00.000Z')), null);
});

test('recordSalePayment rejects excess payments before saving history', async () => {
  const calls = {
    transactions: 0,
    sessionsEnded: 0,
    historyCreated: false,
  };
  const sale = {
    _id: '64f000000000000000000022',
    customer: customerId,
    invoiceNumber: 'SAL-101',
    totalAmount: 1000,
    paidAmount: 900,
    outstandingAmount: 100,
    paymentType: 'Credit',
    invoiceStatus: 'Partially Paid',
    paymentStatus: 'Partially Paid',
    payments: [],
    async save() {
      throw new Error('save should not be called');
    },
  };

  await withMocks(
    [
      [mongoose, { startSession: async () => createSessionMock(calls) }],
      [Sale, { findById: () => ({ session: async () => sale }) }],
      [
        PaymentHistory,
        {
          create: async () => {
            calls.historyCreated = true;
          },
        },
      ],
    ],
    async () => {
      await assert.rejects(
        recordSalePayment({
          saleId: sale._id,
          payment: { amount: 101, paymentMethod: 'Cash' },
          userId,
        }),
        /Payment amount cannot exceed outstanding amount/,
      );
    },
  );

  assert.equal(calls.transactions, 1);
  assert.equal(calls.sessionsEnded, 1);
  assert.equal(calls.historyCreated, false);
});

test('recordPurchasePayment rejects fully paid invoices before saving history', async () => {
  const calls = {
    transactions: 0,
    sessionsEnded: 0,
    historyCreated: false,
  };
  const purchase = {
    _id: '64f000000000000000000012',
    supplier: supplierId,
    totalAmount: 1000,
    paidAmount: 1000,
    dueAmount: 0,
    paymentType: 'Credit',
    bill: { originalName: 'PUR-101' },
    async save() {
      throw new Error('save should not be called');
    },
  };

  await withMocks(
    [
      [mongoose, { startSession: async () => createSessionMock(calls) }],
      [Purchase, { findById: () => ({ session: async () => purchase }) }],
      [
        PaymentHistory,
        {
          create: async () => {
            calls.historyCreated = true;
          },
        },
      ],
    ],
    async () => {
      await assert.rejects(
        recordPurchasePayment({
          purchaseId: purchase._id,
          payment: { amount: 1, paymentMethod: 'Cash' },
          userId,
        }),
        /Fully paid invoice cannot accept payment/,
      );
    },
  );

  assert.equal(calls.transactions, 1);
  assert.equal(calls.sessionsEnded, 1);
  assert.equal(calls.historyCreated, false);
});
