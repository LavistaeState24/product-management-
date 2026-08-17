import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { formatSale } from './formatSale.js';

test('formatSale returns optional invoice fields and item HSN/SAC', () => {
  const sale = {
    _id: new mongoose.Types.ObjectId(),
    customerName: 'Customized Polycast',
    invoiceNumber: 'INV-1',
    invoiceDate: new Date('2026-08-12T00:00:00.000Z'),
    paymentType: 'Credit',
    paidAmount: 100,
    deliveryNote: 'DN-7',
    referenceNumber: 'REF-12',
    referenceDate: new Date('2026-08-11T00:00:00.000Z'),
    buyerOrderNumber: 'PO-55',
    buyerOrderDate: new Date('2026-08-10T00:00:00.000Z'),
    dispatchDocumentNumber: 'DD-9',
    dispatchThrough: 'Road',
    dispatchDate: new Date('2026-08-13T00:00:00.000Z'),
    destination: 'Mumbai',
    vehicleNumber: 'MH12AB1234',
    termsOfDelivery: 'Door delivery',
    freightCharges: 25,
    roundOff: -0.25,
    items: [
      {
        _id: new mongoose.Types.ObjectId(),
        productName: 'PU Rod',
        itemNumber: 'ITEM-1',
        size: '25mm',
        colour: 'Blue',
        weight: 10,
        sellingUnit: 'kg',
        hsnSac: '3917',
        quantity: 2,
        sellingPrice: 100,
        gstRate: 18,
      },
    ],
  };

  const formatted = formatSale(sale);

  assert.equal(formatted.deliveryNote, 'DN-7');
  assert.equal(formatted.referenceNumber, 'REF-12');
  assert.equal(formatted.buyerOrderNumber, 'PO-55');
  assert.equal(formatted.dispatchDocumentNumber, 'DD-9');
  assert.equal(formatted.dispatchThrough, 'Road');
  assert.equal(formatted.destination, 'Mumbai');
  assert.equal(formatted.vehicleNumber, 'MH12AB1234');
  assert.equal(formatted.termsOfDelivery, 'Door delivery');
  assert.equal(formatted.freightCharges, 25);
  assert.equal(formatted.roundOff, -0.25);
  assert.equal(formatted.items[0].hsnSac, '3917');
  assert.equal(formatted.subtotal, 200);
  assert.equal(formatted.gstAmount, 36);
  assert.equal(formatted.grandTotal, 260.75);
});

test('formatSale remains compatible with legacy sales without new invoice fields', () => {
  const sale = {
    _id: new mongoose.Types.ObjectId(),
    customerName: 'Legacy Customer',
    productName: 'Legacy Product',
    invoiceNumber: 'INV-OLD',
    invoiceDate: new Date('2026-08-12T00:00:00.000Z'),
    quantity: 3,
    sellingPrice: 50,
    totalAmount: 150,
    paidAmount: 150,
    paymentType: 'Cash',
  };

  const formatted = formatSale(sale);

  assert.equal(formatted.deliveryNote, '');
  assert.equal(formatted.referenceNumber, '');
  assert.equal(formatted.buyerOrderNumber, '');
  assert.equal(formatted.dispatchDocumentNumber, '');
  assert.equal(formatted.dispatchThrough, '');
  assert.equal(formatted.destination, '');
  assert.equal(formatted.termsOfDelivery, '');
  assert.equal(formatted.freightCharges, 0);
  assert.equal(formatted.roundOff, 0);
  assert.equal(formatted.items[0].hsnSac, '');
  assert.equal(formatted.grandTotal, 150);
});
