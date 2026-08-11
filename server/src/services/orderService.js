
import Order from '../models/Order.js';
import ClientMessageLog from '../models/ClientMessageLog.js';
import OrderNotification from '../models/OrderNotification.js';
import { createHttpError } from '../utils/httpError.js';
import {
  buildAcceptedClientMessage,
  buildReadyForDispatchClientMessage,
} from '../utils/orderMessaging.js';
import {
  acceptOrder as acceptOrderWorkflow,
  addOrderProgressUpdate,
  assignOrderItemNumbers as assignOrderItemNumbersWorkflow,
  markOrderReady,
  markOrderDispatched,
  openClientMessageInWhatsApp,
} from './orderWorkflowService.js';

function parseText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildCreateOrderPayload(body, userId) {
  return {
    clientName: parseText(body.clientName),
    clientMobile: parseText(body.clientMobile),
    remarks: parseText(body.remarks),
    status: 'pending',
    createdBy: userId,
    items: (body.items || []).map((item) => {
      const stockType = item.stockType || 'manual';

      return {
        itemDesc: parseText(item.itemDesc),
        size: parseText(item.size),
        colour: parseText(item.colour),
        hardness: parseText(item.hardness),
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        itemNo: '',
        stockType,
        stockRef: stockType === 'manual' ? null : item.stockRef,
      };
    }),
  };
}

export async function createOrder(body, userId) {
  const order = new Order(buildCreateOrderPayload(body, userId));

  await order.save();

  return order;
}

export async function listOrders({ filter = {} } = {}) {
  return Order.find(filter)
    .sort({ createdAt: -1 })
    .lean();
}

export async function getOrderById(orderId) {
  const order = await Order.findById(orderId).lean();

  if (!order) {
    throw createHttpError(404, 'Order not found.');
  }

  return order;
}

export async function listProductionPendingOrders() {
  return listOrders({
    filter: {
      status: 'pending',
    },
  });
}

export async function listProductionActiveOrders() {
  return listOrders({
    filter: {
      status: {
        $in: ['accepted', 'in_production'],
      },
    },
  });
}

export async function listProductionOrders() {
  return listOrders();
}

export async function listReadyForDispatchOrders() {
  return listOrders({
    filter: {
      status: 'ready',
    },
  });
}

export async function acceptOrder({ orderId, readyDays, userId }) {
  return acceptOrderWorkflow({
    orderId,
    readyDays,
    createdBy: userId,
  });
}

export async function addProductionProgress({ orderId, note, userId }) {
  return addOrderProgressUpdate({
    orderId,
    note,
    createdBy: userId,
  });
}

export async function markProductionReady({ orderId, items, userId }) {
  return markOrderReady({
    orderId,
    items,
    createdBy: userId,
  });
}

export async function assignOrderItemNumbers({ orderId, items }) {
  return assignOrderItemNumbersWorkflow({
    orderId,
    items,
  });
}

export async function dispatchOrder({ orderId, userId }) {
  const order = await Order.findById(orderId);

  if (!order) {
    throw createHttpError(404, 'Order not found.');
  }

  if (order.status !== 'ready') {
    throw createHttpError(422, 'Only Ready orders can be submitted for dispatch.');
  }

  let existingLog = await ClientMessageLog.findOne({
    order: order._id,
    kind: 'ready_for_dispatch',
  });

  if (!existingLog) {
    [existingLog] = await ClientMessageLog.create([
      {
        order: order._id,
        orderNo: order.orderNo,
        clientName: order.clientName,
        clientMobile: order.clientMobile,
        kind: 'ready_for_dispatch',
        message: buildReadyForDispatchClientMessage(order),
        status: 'draft',
        createdBy: userId,
      },
    ]);
  }

  const dispatchedOrder = await markOrderDispatched({
    orderId,
  });

  return {
    order: dispatchedOrder,
    messageLog: existingLog,
  };
}

export async function listOrderNotifications() {
  return OrderNotification.find({ audience: 'boss' })
    .sort({ createdAt: -1 })
    .lean();
}

export async function markNotificationSeen(notificationId) {
  const notification = await OrderNotification.findById(notificationId);

  if (!notification) {
    throw createHttpError(404, 'Order notification not found.');
  }

  notification.seen = true;
  notification.seenAt = notification.seenAt || new Date();
  await notification.save();

  return notification;
}

export async function confirmNotificationForClient(notificationId) {
  const notification = await OrderNotification.findById(notificationId);

  if (!notification) {
    throw createHttpError(404, 'Order notification not found.');
  }

  notification.clientConfirmed = true;
  notification.clientConfirmedAt = notification.clientConfirmedAt || new Date();
  await notification.save();

  return notification;
}

export async function listClientMessageLogs() {
  return ClientMessageLog.find()
    .sort({ createdAt: -1 })
    .lean();
}

export async function getOrCreateAcceptedMessageLog({ notificationId, userId }) {
  const notification = await OrderNotification.findById(notificationId);

  if (!notification) {
    throw createHttpError(404, 'Order notification not found.');
  }

  if (notification.kind !== 'accepted') {
    throw createHttpError(422, 'Only Accepted notifications can prepare client messages.');
  }

  let messageLog = await ClientMessageLog.findOne({
    order: notification.order,
    kind: 'order_accepted',
  });

  if (!messageLog) {
    const order = await Order.findById(notification.order);

    if (!order) {
      throw createHttpError(404, 'Order not found.');
    }

    [messageLog] = await ClientMessageLog.create([
      {
        order: order._id,
        orderNo: order.orderNo,
        clientName: order.clientName,
        clientMobile: order.clientMobile,
        kind: 'order_accepted',
        message: buildAcceptedClientMessage(order),
        status: 'draft',
        createdBy: userId,
      },
    ]);
  }

  notification.clientConfirmed = true;
  notification.clientConfirmedAt = notification.clientConfirmedAt || new Date();
  await notification.save();

  return messageLog;
}

export async function openMessageInWhatsApp(messageLogId) {
  return openClientMessageInWhatsApp({
    messageLogId,
  });
}
