import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import ClientMessageLog from '../models/ClientMessageLog.js';
import Order from '../models/Order.js';
import OrderNotification from '../models/OrderNotification.js';
import { buildCreateOrderPayload } from './orderService.js';
import {
  acceptOrder,
  addOrderProgressUpdate,
  markOrderReady,
  runOrderTransaction,
} from './orderWorkflowService.js';

const userId = new mongoose.Types.ObjectId();
const orderId = new mongoose.Types.ObjectId();

function createOrderDoc(overrides = {}) {
  return {
    _id: orderId,
    orderNo: 'ORD-0001',
    clientName: 'Acme Industries',
    clientMobile: '9876543210',
    status: 'pending',
    readyDays: null,
    acceptedAt: null,
    readyByDate: null,
    items: [
      {
        itemDesc: 'PU wheel',
        size: '100mm',
        colour: 'Blue',
        hardness: '80A',
        quantity: 2,
        rate: 100,
        itemNo: '',
        stockType: 'manual',
        stockRef: null,
      },
    ],
    save: async () => {},
    ...overrides,
  };
}

async function withMocks(mocks, run) {
  const originals = new Map();

  for (const [target, methods] of mocks) {
    for (const [method, replacement] of Object.entries(methods)) {
      originals.set(`${target.modelName || target.constructor.name}.${method}`, {
        target,
        method,
        value: target[method],
      });
      target[method] = replacement;
    }
  }

  try {
    return await run();
  } finally {
    for (const original of originals.values()) {
      original.target[original.method] = original.value;
    }
  }
}

test('buildCreateOrderPayload ignores frontend orderNo, status, and itemNo', () => {
  const payload = buildCreateOrderPayload(
    {
      orderNo: 'ORD-HACK',
      status: 'ready',
      clientName: ' Acme Industries ',
      clientMobile: ' 9876543210 ',
      remarks: ' urgent ',
      items: [
        {
          itemDesc: ' PU wheel ',
          size: ' 100mm ',
          colour: ' Blue ',
          hardness: ' 80A ',
          quantity: '2',
          rate: '125',
          itemNo: 'ITEM-HACK',
          stockType: 'manual',
          stockRef: new mongoose.Types.ObjectId(),
        },
      ],
    },
    userId,
  );

  assert.equal(payload.orderNo, undefined);
  assert.equal(payload.status, 'pending');
  assert.equal(payload.createdBy, userId);
  assert.equal(payload.clientName, 'Acme Industries');
  assert.equal(payload.clientMobile, '9876543210');
  assert.equal(payload.items[0].itemNo, '');
  assert.equal(payload.items[0].stockRef, null);
  assert.equal(payload.items[0].quantity, 2);
  assert.equal(payload.items[0].rate, 125);
  assert.equal(payload.productReference, undefined);
});

test('buildCreateOrderPayload includes sanitized product reference metadata when supplied', () => {
  const payload = buildCreateOrderPayload(
    {
      clientName: 'Acme Industries',
      clientMobile: '9876543210',
      items: [
        {
          itemDesc: 'PU wheel',
          quantity: '2',
          rate: '125',
          stockType: 'manual',
        },
      ],
    },
    userId,
    {
      url: 'https://example.com/reference.pdf',
      key: 'order-product-references/reference.pdf',
      originalName: 'reference.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      ignored: 'value',
    },
  );

  assert.deepEqual(payload.productReference, {
    url: 'https://example.com/reference.pdf',
    key: 'order-product-references/reference.pdf',
    originalName: 'reference.pdf',
    mimeType: 'application/pdf',
    size: 2048,
  });
});

test('acceptOrder sets accepted status, ready date, and creates boss notification', async () => {
  const order = createOrderDoc();
  let saved = false;
  let notificationCreated = false;
  let messageLogCreated = false;

  order.save = async ({ session }) => {
    assert.ok(session);
    saved = true;
  };

  await withMocks(
    [
      [
        mongoose,
        {
          startSession: async () => ({
            withTransaction: async (fn) => fn(),
            endSession: async () => {},
          }),
        },
      ],
      [
        Order,
        {
          findById: () => ({
            session: async () => order,
          }),
        },
      ],
      [
        OrderNotification,
        {
          create: async ([document], { session }) => {
            assert.ok(session);
            assert.equal(document.audience, 'boss');
            assert.equal(document.kind, 'accepted');
            assert.equal(document.orderNo, 'ORD-0001');
            notificationCreated = true;
            return [{ _id: new mongoose.Types.ObjectId(), ...document }];
          },
        },
      ],
      [
        ClientMessageLog,
        {
          findOne: () => ({
            session: async () => null,
          }),
          create: async ([document], { session }) => {
            assert.ok(session);
            assert.equal(document.kind, 'order_accepted');
            assert.equal(document.status, 'draft');
            messageLogCreated = true;
            return [{ _id: new mongoose.Types.ObjectId(), ...document }];
          },
        },
      ],
    ],
    async () => {
      const result = await acceptOrder({
        orderId,
        readyDays: 3,
        userId,
      });

      assert.equal(result.order.status, 'accepted');
      assert.equal(result.order.readyDays, 3);
      assert.ok(result.order.acceptedAt instanceof Date);
      assert.ok(result.order.readyByDate instanceof Date);
      assert.equal(saved, true);
      assert.equal(notificationCreated, true);
      assert.equal(messageLogCreated, true);
    },
  );
});

test('acceptOrder blocks repeated acceptance', async () => {
  const order = createOrderDoc({
    status: 'accepted',
  });

  await withMocks(
    [
      [
        mongoose,
        {
          startSession: async () => ({
            withTransaction: async (fn) => fn(),
            endSession: async () => {},
          }),
        },
      ],
      [
        Order,
        {
          findById: () => ({
            session: async () => order,
          }),
        },
      ],
    ],
    async () => {
      await assert.rejects(
        acceptOrder({
          orderId,
          readyDays: 3,
          userId,
        }),
        /cannot move from accepted to accepted/,
      );
    },
  );
});

test('addOrderProgressUpdate keeps production response data separate from client messaging', async () => {
  const order = createOrderDoc({
    status: 'accepted',
    dailyUpdates: [],
  });
  let saved = false;
  let notificationCreated = false;

  order.save = async ({ session }) => {
    assert.ok(session);
    saved = true;
  };

  await withMocks(
    [
      [
        mongoose,
        {
          startSession: async () => ({
            withTransaction: async (fn) => fn(),
            endSession: async () => {},
          }),
        },
      ],
      [
        Order,
        {
          findById: () => ({
            session: async () => order,
          }),
        },
      ],
      [
        OrderNotification,
        {
          create: async ([document], { session }) => {
            assert.ok(session);
            assert.equal(document.kind, 'progress');
            assert.equal(document.message, 'Cutting completed');
            notificationCreated = true;
            return [{ _id: new mongoose.Types.ObjectId(), ...document }];
          },
        },
      ],
    ],
    async () => {
      const result = await addOrderProgressUpdate({
        orderId,
        note: 'Cutting completed',
        createdBy: userId,
      });

      assert.equal(result.order.status, 'in_production');
      assert.equal(result.order.dailyUpdates[0].note, 'Cutting completed');
      assert.equal(saved, true);
      assert.equal(notificationCreated, true);
    },
  );
});

test('markOrderReady assigns every item number before Ready without deducting stock', async () => {
  const stockRef = new mongoose.Types.ObjectId();
  const order = createOrderDoc({
    status: 'in_production',
    dailyUpdates: [],
    items: [
      {
        itemDesc: 'PU wheel',
        quantity: 2,
        rate: 100,
        itemNo: '',
        stockType: 'manual',
        stockRef: null,
      },
      {
        itemDesc: 'Rod',
        quantity: 1,
        rate: 50,
        itemNo: '',
        stockType: 'manual',
        stockRef: null,
      },
    ],
  });
  let saved = false;
  let messageLogCreated = false;

  order.save = async ({ session }) => {
    assert.ok(session);
    saved = true;
  };

  await withMocks(
    [
      [
        mongoose,
        {
          startSession: async () => ({
            withTransaction: async (fn) => fn(),
            endSession: async () => {},
          }),
        },
      ],
      [
        Order,
        {
          findById: () => ({
            session: async () => order,
          }),
        },
      ],
      [
        OrderNotification,
        {
          create: async ([document], { session }) => {
            assert.ok(session);
            assert.equal(document.kind, 'ready');
            return [{ _id: new mongoose.Types.ObjectId(), ...document }];
          },
        },
      ],
      [
        ClientMessageLog,
        {
          findOne: () => ({
            session: async () => null,
          }),
          create: async ([document], { session }) => {
            assert.ok(session);
            assert.equal(document.kind, 'ready_for_dispatch');
            assert.equal(document.status, 'draft');
            messageLogCreated = true;
            return [{ _id: new mongoose.Types.ObjectId(), ...document }];
          },
        },
      ],
    ],
    async () => {
      const result = await markOrderReady({
        orderId,
        createdBy: userId,
        items: [
          {
            itemNo: 'MANUAL-1',
            stockType: 'manual',
            stockRef: null,
          },
          {
            itemNo: 'ROD-1',
            stockType: 'rod',
            stockRef,
          },
        ],
      });

      assert.equal(result.order.status, 'ready');
      assert.equal(result.order.items[0].itemNo, 'MANUAL-1');
      assert.equal(result.order.items[0].stockRef, null);
      assert.equal(result.order.items[1].itemNo, 'ROD-1');
      assert.equal(String(result.order.items[1].stockRef), String(stockRef));
      assert.equal(saved, true);
      assert.equal(messageLogCreated, true);
    },
  );
});

test('runOrderTransaction closes sessions', async () => {
  let ended = false;

  await withMocks(
    [
      [
        mongoose,
        {
          startSession: async () => ({
            withTransaction: async (fn) => fn(),
            endSession: async () => {
              ended = true;
            },
          }),
        },
      ],
    ],
    async () => {
      await runOrderTransaction(async () => 'ok');
    },
  );

  assert.equal(ended, true);
});
