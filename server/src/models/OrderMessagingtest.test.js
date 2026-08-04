import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import ClientMessageLog, {
  CLIENT_MESSAGE_CHANNELS,
  CLIENT_MESSAGE_KINDS,
  CLIENT_MESSAGE_STATUSES,
} from './ClientMessageLog.js';
import OrderNotification, {
  ORDER_NOTIFICATION_KINDS,
} from './OrderNotification.js';

const orderId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();

test('OrderNotification supports boss-only accepted, progress, and ready notifications', () => {
  assert.deepEqual(ORDER_NOTIFICATION_KINDS, [
    'accepted',
    'progress',
    'ready',
  ]);

  const notification = new OrderNotification({
    order: orderId,
    orderNo: 'ORD-0001',
    kind: 'progress',
    message: 'Progress update',
    createdBy: userId,
  });

  const error = notification.validateSync();

  assert.equal(error, undefined);
  assert.equal(notification.audience, 'boss');
  assert.equal(notification.seen, false);
  assert.equal(notification.clientConfirmed, false);
});

test('OrderNotification allows multiple progress notifications by schema design', () => {
  const indexes = OrderNotification.schema.indexes();
  const uniqueProgressIndex = indexes.find(
    ([fields, options]) =>
      fields.order === 1 &&
      fields.kind === 1 &&
      options?.unique === true,
  );

  assert.equal(uniqueProgressIndex, undefined);
});

test('ClientMessageLog supports only manual WhatsApp draft/opened statuses', () => {
  assert.deepEqual(CLIENT_MESSAGE_KINDS, [
    'order_accepted',
    'ready_for_dispatch',
  ]);
  assert.deepEqual(CLIENT_MESSAGE_CHANNELS, ['whatsapp_manual']);
  assert.deepEqual(CLIENT_MESSAGE_STATUSES, ['draft', 'opened']);

  const messageLog = new ClientMessageLog({
    order: orderId,
    orderNo: 'ORD-0001',
    clientName: 'Ramesh',
    clientMobile: '9876543210',
    kind: 'order_accepted',
    message: 'Accepted message',
    createdBy: userId,
  });

  const error = messageLog.validateSync();

  assert.equal(error, undefined);
  assert.equal(messageLog.channel, 'whatsapp_manual');
  assert.equal(messageLog.status, 'draft');
});

test('ClientMessageLog rejects sent or delivered status claims', () => {
  const messageLog = new ClientMessageLog({
    order: orderId,
    orderNo: 'ORD-0001',
    clientName: 'Ramesh',
    clientMobile: '9876543210',
    kind: 'order_accepted',
    message: 'Accepted message',
    status: 'sent',
    createdBy: userId,
  });

  const error = messageLog.validateSync();

  assert.ok(error.errors.status);
});

test('ClientMessageLog has unique order-kind index to prevent duplicates', () => {
  const indexes = ClientMessageLog.schema.indexes();
  const uniqueIndex = indexes.find(
    ([fields, options]) =>
      fields.order === 1 &&
      fields.kind === 1 &&
      options?.unique === true,
  );

  assert.ok(uniqueIndex);
});

test('Message model collection names are additive for migration safety', () => {
  assert.equal(OrderNotification.collection.name, 'ordernotifications');
  assert.equal(ClientMessageLog.collection.name, 'clientmessagelogs');
});