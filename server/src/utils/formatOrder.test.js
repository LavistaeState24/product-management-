import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import {
  serializeOrderForBoss,
  serializeOrderForProduction,
} from './formatOrder.js';

const order = {
  _id: new mongoose.Types.ObjectId(),
  orderNo: 'ORD-0001',
  clientName: 'Acme Industries',
  clientMobile: '9876543210',
  remarks: 'Urgent',
  productReference: {
    url: 'https://example.com/reference.png',
    key: 'order-product-references/reference.png',
    originalName: 'reference.png',
    mimeType: 'image/png',
    size: 1234,
  },
  status: 'accepted',
  readyDays: 3,
  acceptedAt: new Date('2026-08-04T00:00:00.000Z'),
  readyByDate: new Date('2026-08-07T00:00:00.000Z'),
  dispatchedAt: null,
  createdBy: new mongoose.Types.ObjectId(),
  createdAt: new Date('2026-08-04T00:00:00.000Z'),
  updatedAt: new Date('2026-08-04T00:00:00.000Z'),
  items: [
    {
      itemDesc: 'PU wheel',
      size: '100mm',
      colour: 'Blue',
      hardness: '80A',
      quantity: 2,
      rate: 125,
      itemNo: 'ITEM-1',
      stockType: 'manual',
      stockRef: null,
    },
  ],
  dailyUpdates: [
    {
      note: 'Started production',
      createdBy: new mongoose.Types.ObjectId(),
      createdAt: new Date('2026-08-05T00:00:00.000Z'),
    },
  ],
};

test('serializeOrderForBoss includes client and rate details', () => {
  const serialized = serializeOrderForBoss(order);

  assert.equal(serialized.clientName, order.clientName);
  assert.equal(serialized.clientMobile, order.clientMobile);
  assert.equal(serialized.items[0].rate, 125);
  assert.equal(serialized.readyDays, 3);
  assert.deepEqual(serialized.productReference, order.productReference);
});

test('serializeOrderForProduction includes attachment and omits confidential details', () => {
  const serialized = serializeOrderForProduction(order);

  assert.deepEqual(serialized.productReference, order.productReference);
  assert.equal('clientName' in serialized, false);
  assert.equal('clientMobile' in serialized, false);
  assert.equal('rate' in serialized.items[0], false);
  assert.equal('messageLogs' in serialized, false);
  assert.equal('whatsappUrl' in serialized, false);
  assert.deepEqual(Object.keys(serialized.items[0]).sort(), [
    'colour',
    'hardness',
    'itemDesc',
    'itemNo',
    'quantity',
    'size',
    'stockRef',
    'stockType',
  ]);
});
