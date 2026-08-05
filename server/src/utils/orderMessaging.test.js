import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertOrderStatusTransition,
  buildAcceptedClientMessage,
  buildReadyForDispatchClientMessage,
  buildWhatsAppDeepLink,
  normalizeIndianWhatsAppPhone,
  ORDER_STATUS_TRANSITIONS,
} from './orderMessaging.js';

const order = {
  orderNo: 'ORD-0001',
  clientName: 'Ramesh',
  readyByDate: new Date('2026-08-10T00:00:00.000Z'),
};

test('ORDER_STATUS_TRANSITIONS allow only the approved workflow', () => {
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.pending, ['accepted']);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.accepted, [
    'in_production',
    'ready',
  ]);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.in_production, [
    'in_production',
    'ready',
  ]);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.ready, ['dispatched']);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.dispatched, []);
});

test('assertOrderStatusTransition rejects invalid order jumps', () => {
  assert.doesNotThrow(() =>
    assertOrderStatusTransition('pending', 'accepted'),
  );

  assert.throws(
    () => assertOrderStatusTransition('pending', 'ready'),
    /cannot move from pending to ready/,
  );
});

test('buildAcceptedClientMessage uses the approved template', () => {
  const message = buildAcceptedClientMessage(order);

  assert.match(message, /Namaste Ramesh/);
  assert.match(message, /order ORD-0001 accept ho gaya hai/);
  assert.match(message, /10 Aug 2026/);
  assert.match(message, /Customized Polycast Pvt\. Ltd\./);
});

test('buildReadyForDispatchClientMessage uses the approved template', () => {
  const message = buildReadyForDispatchClientMessage(order);

  assert.match(message, /order ORD-0001 ready hai/);
  assert.match(message, /dispatch ke liye submit kar diya gaya hai/);
  assert.match(message, /Delivery coordination/);
});

test('normalizeIndianWhatsAppPhone normalizes Indian mobile numbers', () => {
  assert.equal(normalizeIndianWhatsAppPhone('98765 43210'), '919876543210');
  assert.equal(normalizeIndianWhatsAppPhone('+91-98765-43210'), '919876543210');
  assert.equal(normalizeIndianWhatsAppPhone('(98765) 43210'), '919876543210');
});

test('normalizeIndianWhatsAppPhone rejects invalid mobile numbers', () => {
  assert.throws(
    () => normalizeIndianWhatsAppPhone('12345'),
    /valid Indian mobile number/,
  );

  assert.throws(
    () => normalizeIndianWhatsAppPhone('911234567890'),
    /valid Indian mobile number/,
  );
});

test('buildWhatsAppDeepLink creates a prefilled manual WhatsApp link', () => {
  const url = buildWhatsAppDeepLink({
    clientMobile: '9876543210',
    message: 'Hello order ORD-0001',
  });

  assert.equal(
    url,
    'https://wa.me/919876543210?text=Hello%20order%20ORD-0001',
  );
});