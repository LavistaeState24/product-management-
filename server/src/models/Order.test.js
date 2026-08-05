import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import Counter from './Counter.js';
import Order, {
  ORDER_STATUSES,
  ORDER_STOCK_TYPES,
} from './Order.js';

const userId = new mongoose.Types.ObjectId();
const stockId = new mongoose.Types.ObjectId();

function createValidOrder(overrides = {}) {
  return new Order({
    clientName: 'Acme Industries',
    clientMobile: '9876543210',
    createdBy: userId,
    items: [
      {
        itemDesc: 'PU wheel',
        size: '100mm',
        colour: 'Blue',
        hardness: '80A',
        quantity: 2,
        rate: 125,
        itemNo: '',
        stockType: 'manual',
        stockRef: null,
      },
    ],
    ...overrides,
  });
}

function mockCounter(sequenceStart = 0) {
  const original = Counter.findOneAndUpdate;
  let sequence = sequenceStart;

  Counter.findOneAndUpdate = () =>
    Promise.resolve({
      seq: (sequence += 1),
    });

  return () => {
    Counter.findOneAndUpdate = original;
  };
}

test('Order supports the requested status and stock type values', () => {
  assert.deepEqual(ORDER_STATUSES, [
    'pending',
    'accepted',
    'in_production',
    'ready',
    'dispatched',
  ]);

  assert.deepEqual(ORDER_STOCK_TYPES, [
    'rod',
    'sheet',
    'pu-product',
    'finished-goods',
    'manual',
  ]);
});

test('Order validates required client fields and at least one item', async () => {
  const restore = mockCounter();

  try {
    const order = createValidOrder({
      clientName: '',
      clientMobile: '',
      items: [],
    });

    await assert.rejects(order.validate(), {
      name: 'ValidationError',
    });

    const error = order.validateSync();
    assert.ok(error.errors.clientName);
    assert.ok(error.errors.clientMobile);
    assert.ok(error.errors.items);
  } finally {
    restore();
  }
});

test('Order validates item description, positive quantity, and non-negative rate', async () => {
  const restore = mockCounter();

  try {
    const order = createValidOrder({
      items: [
        {
          itemDesc: '',
          quantity: 0,
          rate: -1,
          stockType: 'manual',
          stockRef: null,
        },
      ],
    });

    await assert.rejects(order.validate(), {
      name: 'ValidationError',
    });
  } finally {
    restore();
  }
});

test('Order generates backend order numbers and overwrites supplied values on create', async () => {
  const restore = mockCounter();

  try {
    const order = createValidOrder({
      orderNo: 'ORD-FRONTEND',
    });

    await order.validate();

    assert.equal(order.orderNo, 'ORD-0001');
  } finally {
    restore();
  }
});

test('Order orderNo is immutable and unique', () => {
  const orderNoPath = Order.schema.path('orderNo');

  assert.equal(orderNoPath.options.immutable, true);
  assert.equal(orderNoPath.options.unique, true);
});

test('Order accepts multi-item stock references and manual entries', async () => {
  const restore = mockCounter();

  try {
    const order = createValidOrder({
      items: [
        {
          itemDesc: 'Rod item',
          quantity: 1,
          rate: 10,
          itemNo: 'ROD-000001',
          stockType: 'rod',
          stockRef: stockId,
        },
        {
          itemDesc: 'Manual custom item',
          quantity: 3,
          rate: 20,
          itemNo: 'CUSTOM-1',
          stockType: 'manual',
          stockRef: null,
        },
      ],
    });

    await order.validate();

    assert.equal(order.items.length, 2);
    assert.equal(order.items[0].stockType, 'rod');
    assert.equal(order.items[1].stockType, 'manual');
  } finally {
    restore();
  }
});

test('Order requires stockRef for non-manual stock-linked items', async () => {
  const restore = mockCounter();

  try {
    const order = createValidOrder({
      items: [
        {
          itemDesc: 'Sheet item',
          quantity: 1,
          rate: 10,
          stockType: 'sheet',
          stockRef: null,
        },
      ],
    });

    await assert.rejects(order.validate(), {
      name: 'ValidationError',
    });
  } finally {
    restore();
  }
});

test('Order validates readyDays as a positive integer when present', async () => {
  const restore = mockCounter();

  try {
    await assert.rejects(
      createValidOrder({ readyDays: 0 }).validate(),
      { name: 'ValidationError' },
    );

    await assert.rejects(
      createValidOrder({ readyDays: 1.5 }).validate(),
      { name: 'ValidationError' },
    );
  } finally {
    restore();
  }
});

test('Order requires every itemNo before Ready', async () => {
  const restore = mockCounter();

  try {
    const order = createValidOrder({
      status: 'ready',
      items: [
        {
          itemDesc: 'Pending item number',
          quantity: 1,
          rate: 10,
          stockType: 'manual',
          stockRef: null,
        },
      ],
    });

    await assert.rejects(order.validate(), {
      name: 'ValidationError',
    });
  } finally {
    restore();
  }
});

test('Order requires dispatchedAt for dispatched orders', async () => {
  const restore = mockCounter();

  try {
    const order = createValidOrder({
      status: 'dispatched',
      items: [
        {
          itemDesc: 'Ready item',
          quantity: 1,
          rate: 10,
          itemNo: 'ORD-ITEM-1',
          stockType: 'manual',
          stockRef: null,
        },
      ],
      dispatchedAt: null,
    });

    await assert.rejects(order.validate(), {
      name: 'ValidationError',
    });
  } finally {
    restore();
  }
});
