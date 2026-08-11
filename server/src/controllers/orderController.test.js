import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { serializeOrderForUser } from './orderController.js';
import { PERMISSIONS, ROLES } from '../utils/permissions.js';

const order = {
  _id: new mongoose.Types.ObjectId(),
  orderNo: 'ORD-0007',
  clientName: 'Acme Industries',
  clientMobile: '9876543210',
  remarks: 'Urgent',
  productReference: {
    url: 'https://example.com/reference.pdf',
    key: 'order-product-references/reference.pdf',
    originalName: 'reference.pdf',
    mimeType: 'application/pdf',
    size: 2048,
  },
  status: 'accepted',
  readyDays: 3,
  readyByDate: new Date('2026-08-07T00:00:00.000Z'),
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
};

test('serializeOrderForUser includes client details only with permission', () => {
  const serialized = serializeOrderForUser(order, {
    role: ROLES.Accountant,
    permissions: [
      PERMISSIONS.canViewOrders,
      PERMISSIONS.canViewOrderClientDetails,
    ],
  });

  assert.equal(serialized.clientName, order.clientName);
  assert.equal(serialized.clientMobile, order.clientMobile);
  assert.equal(serialized.items[0].rate, 125);
});

test('serializeOrderForUser omits client, rate, and amount data without permission', () => {
  const serialized = serializeOrderForUser(order, {
    role: ROLES['Stock Incharge'],
    permissions: [PERMISSIONS.canViewOrders],
  });

  assert.equal('clientName' in serialized, false);
  assert.equal('clientMobile' in serialized, false);
  assert.equal('rate' in serialized.items[0], false);
  assert.equal('amount' in serialized.items[0], false);
  assert.equal('amounts' in serialized, false);
  assert.equal('totals' in serialized, false);
  assert.deepEqual(serialized.productReference, order.productReference);
  assert.equal('messageLogs' in serialized, false);
  assert.equal('whatsappUrl' in serialized, false);
});

test('serializeOrderForUser treats Boss as all-access', () => {
  const serialized = serializeOrderForUser(order, {
    role: ROLES.Boss,
    permissions: [],
  });

  assert.equal(serialized.clientName, order.clientName);
  assert.equal(serialized.clientMobile, order.clientMobile);
  assert.equal(serialized.items[0].rate, 125);
});
