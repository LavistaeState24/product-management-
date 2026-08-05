import assert from 'node:assert/strict';
import test from 'node:test';

import Counter from '../models/Counter.js';
import {
  formatOrderNo,
  generateOrderNo,
  getNextSequence,
  ORDER_COUNTER_NAME,
} from './orderNumber.js';

function mockCounterFindOneAndUpdate(handler) {
  const original = Counter.findOneAndUpdate;

  Counter.findOneAndUpdate = handler;

  return () => {
    Counter.findOneAndUpdate = original;
  };
}

test('formatOrderNo formats four-digit order numbers', () => {
  assert.equal(formatOrderNo(1), 'ORD-0001');
  assert.equal(formatOrderNo(42), 'ORD-0042');
  assert.equal(formatOrderNo(10000), 'ORD-10000');
});

test('getNextSequence increments counter atomically through findOneAndUpdate', async () => {
  const restore = mockCounterFindOneAndUpdate((filter, update, options) => {
    assert.deepEqual(filter, { name: ORDER_COUNTER_NAME });
    assert.deepEqual(update, { $inc: { seq: 1 } });
    assert.equal(options.new, true);
    assert.equal(options.upsert, true);

    return Promise.resolve({ seq: 7 });
  });

  try {
    assert.equal(await getNextSequence(ORDER_COUNTER_NAME), 7);
  } finally {
    restore();
  }
});

test('generateOrderNo returns unique sequential order numbers', async () => {
  let seq = 0;
  const restore = mockCounterFindOneAndUpdate(() =>
    Promise.resolve({ seq: (seq += 1) }),
  );

  try {
    const values = await Promise.all([
      generateOrderNo(),
      generateOrderNo(),
      generateOrderNo(),
    ]);

    assert.deepEqual(values, ['ORD-0001', 'ORD-0002', 'ORD-0003']);
  } finally {
    restore();
  }
});