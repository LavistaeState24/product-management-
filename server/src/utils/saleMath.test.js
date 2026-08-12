import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateSaleInvoice } from './saleMath.js';

const baseItems = [
  {
    quantity: 2,
    sellingPrice: 100,
    gstRate: 18,
  },
];

test('calculateSaleInvoice keeps old sales totals unchanged when freight and round off are absent', () => {
  const invoice = calculateSaleInvoice({
    items: baseItems,
    paymentType: 'Credit',
    paidAmount: 0,
    invoiceDate: new Date('2026-08-12T00:00:00.000Z'),
  });

  assert.equal(invoice.subtotal, 200);
  assert.equal(invoice.gstAmount, 36);
  assert.equal(invoice.freightCharges, 0);
  assert.equal(invoice.roundOff, 0);
  assert.equal(invoice.grandTotal, 236);
  assert.equal(invoice.totalAmount, 236);
  assert.equal(invoice.outstandingAmount, 236);
  assert.equal(invoice.paymentStatus, 'Unpaid');
});

test('calculateSaleInvoice includes freight and round off in cash sale totals', () => {
  const invoice = calculateSaleInvoice({
    items: baseItems,
    paymentType: 'Cash',
    paidAmount: 0,
    invoiceDate: new Date('2026-08-12T00:00:00.000Z'),
    freightCharges: 50,
    roundOff: -0.25,
  });

  assert.equal(invoice.subtotal, 200);
  assert.equal(invoice.gstAmount, 36);
  assert.equal(invoice.freightCharges, 50);
  assert.equal(invoice.roundOff, -0.25);
  assert.equal(invoice.grandTotal, 285.75);
  assert.equal(invoice.paidAmount, 285.75);
  assert.equal(invoice.outstandingAmount, 0);
  assert.equal(invoice.paymentStatus, 'Paid');
});

test('calculateSaleInvoice includes freight and round off in credit outstanding', () => {
  const invoice = calculateSaleInvoice({
    items: baseItems,
    paymentType: 'Credit',
    paidAmount: 100,
    invoiceDate: new Date('2026-08-12T00:00:00.000Z'),
    freightCharges: 25,
    roundOff: 0.5,
  });

  assert.equal(invoice.grandTotal, 261.5);
  assert.equal(invoice.paidAmount, 100);
  assert.equal(invoice.outstandingAmount, 161.5);
  assert.equal(invoice.paymentStatus, 'Partially Paid');
});
