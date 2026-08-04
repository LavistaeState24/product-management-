import mongoose from 'mongoose';
import ClientMessageLog from '../models/ClientMessageLog.js';
import Order from '../models/Order.js';
import OrderNotification from '../models/OrderNotification.js';
import { createHttpError } from '../utils/httpError.js';
import {
  assertOrderStatusTransition,
  buildAcceptedClientMessage,
  buildOrderNotificationMessage,
  buildReadyForDispatchClientMessage,
  buildWhatsAppDeepLink,
} from '../utils/orderMessaging.js';

export async function runOrderTransaction(work) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await work(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
}

async function findOrderOrThrow(orderId, session) {
  const order = await Order.findById(orderId).session(session);

  if (!order) {
    throw createHttpError(404, 'Order not found.');
  }

  return order;
}

async function createBossNotification({
  order,
  kind,
  message,
  createdBy,
  session,
}) {
  const [notification] = await OrderNotification.create(
    [
      {
        order: order._id,
        orderNo: order.orderNo,
        audience: 'boss',
        kind,
        message,
        createdBy,
      },
    ],
    { session },
  );

  return notification;
}

async function createClientMessageLog({
  order,
  kind,
  message,
  createdBy,
  session,
}) {
  const existing = await ClientMessageLog.findOne({
    order: order._id,
    kind,
  }).session(session);

  if (existing) {
    throw createHttpError(
      409,
      `Client message log already exists for ${kind}.`,
    );
  }

  const [log] = await ClientMessageLog.create(
    [
      {
        order: order._id,
        orderNo: order.orderNo,
        clientName: order.clientName,
        clientMobile: order.clientMobile,
        kind,
        message,
        status: 'draft',
        createdBy,
      },
    ],
    { session },
  );

  return log;
}

export async function acceptOrder({
  orderId,
  readyDays,
  createdBy,
}) {
  if (!Number.isInteger(readyDays) || readyDays <= 0) {
    throw createHttpError(422, 'Ready days must be a positive integer.');
  }

  return runOrderTransaction(async (session) => {
    const order = await findOrderOrThrow(orderId, session);
    assertOrderStatusTransition(order.status, 'accepted');

    const acceptedAt = new Date();
    order.status = 'accepted';
    order.readyDays = readyDays;
    order.acceptedAt = acceptedAt;
    order.readyByDate = new Date(
      acceptedAt.getTime() + readyDays * 24 * 60 * 60 * 1000,
    );

    await order.save({ session });

    const notification = await createBossNotification({
      order,
      kind: 'accepted',
      message: buildOrderNotificationMessage({
        order,
        kind: 'accepted',
      }),
      createdBy,
      session,
    });

    const messageLog = await createClientMessageLog({
      order,
      kind: 'order_accepted',
      message: buildAcceptedClientMessage(order),
      createdBy,
      session,
    });

    return {
      order,
      notification,
      messageLog,
    };
  });
}

export async function addOrderProgressUpdate({
  orderId,
  note,
  createdBy,
}) {
  return runOrderTransaction(async (session) => {
    const order = await findOrderOrThrow(orderId, session);
    assertOrderStatusTransition(order.status, 'in_production');

    order.status = 'in_production';
    order.dailyUpdates.push({
      note,
      createdBy,
    });

    await order.save({ session });

    const notification = await createBossNotification({
      order,
      kind: 'progress',
      message: buildOrderNotificationMessage({
        order,
        kind: 'progress',
        note,
      }),
      createdBy,
      session,
    });

    return {
      order,
      notification,
    };
  });
}

export async function markOrderReady({
  orderId,
  createdBy,
}) {
  return runOrderTransaction(async (session) => {
    const order = await findOrderOrThrow(orderId, session);
    assertOrderStatusTransition(order.status, 'ready');

    order.status = 'ready';
    await order.save({ session });

    const notification = await createBossNotification({
      order,
      kind: 'ready',
      message: buildOrderNotificationMessage({
        order,
        kind: 'ready',
      }),
      createdBy,
      session,
    });

    const messageLog = await createClientMessageLog({
      order,
      kind: 'ready_for_dispatch',
      message: buildReadyForDispatchClientMessage(order),
      createdBy,
      session,
    });

    return {
      order,
      notification,
      messageLog,
    };
  });
}

export async function markOrderDispatched({
  orderId,
  dispatchedAt = new Date(),
}) {
  return runOrderTransaction(async (session) => {
    const order = await findOrderOrThrow(orderId, session);
    assertOrderStatusTransition(order.status, 'dispatched');

    order.status = 'dispatched';
    order.dispatchedAt = dispatchedAt;
    await order.save({ session });

    return order;
  });
}

export async function openClientMessageInWhatsApp({
  messageLogId,
}) {
  const messageLog = await ClientMessageLog.findById(messageLogId);

  if (!messageLog) {
    throw createHttpError(404, 'Client message log not found.');
  }

  const whatsappUrl = buildWhatsAppDeepLink({
    clientMobile: messageLog.clientMobile,
    message: messageLog.message,
  });

  messageLog.status = 'opened';
  messageLog.whatsappOpenedAt = new Date();
  await messageLog.save();

  return {
    messageLog,
    whatsappUrl,
  };
}
