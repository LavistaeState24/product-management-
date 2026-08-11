
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
import {
  deleteStoredFile,
  getStoredFileSignedUrl,
  uploadOrderProductReference,
} from './purchaseBillStorageService.js';

function parseText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function serializeProductReference(productReference) {
  if (!productReference?.key) {
    return null;
  }

  return {
    url: productReference.url || null,
    key: productReference.key,
    originalName: productReference.originalName || '',
    mimeType: productReference.mimeType || '',
    size: productReference.size ?? 0,
  };
}

export function buildCreateOrderPayload(body, userId, productReference = null) {
  const payload = {
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

  const sanitizedProductReference =
    serializeProductReference(productReference);

  if (sanitizedProductReference) {
    payload.productReference = sanitizedProductReference;
  }

  return payload;
}

async function hydrateProductReferenceUrl(order) {
  const plainOrder =
    order?.toObject
      ? order.toObject()
      : order;

  if (!plainOrder?.productReference?.key) {
    return plainOrder;
  }

  const productReference = {
    ...plainOrder.productReference,
  };

  try {
    productReference.url = await getStoredFileSignedUrl(
      productReference.key,
      {
        originalName:
          productReference.originalName ||
          'product-reference',
      },
    );
  } catch (error) {
    console.error(
      'Failed to generate order product reference URL:',
      error,
    );
    productReference.url = plainOrder.productReference.url || null;
  }

  return {
    ...plainOrder,
    productReference,
  };
}

async function hydrateOrdersProductReferenceUrls(orders) {
  return Promise.all(
    orders.map((order) =>
      hydrateProductReferenceUrl(order),
    ),
  );
}

export async function createOrder(body, userId, file = null) {
  const productReference =
    file
      ? await uploadOrderProductReference(file)
      : null;

  const order = new Order(
    buildCreateOrderPayload(
      body,
      userId,
      productReference,
    ),
  );

  try {
    await order.save();
  } catch (error) {
    if (productReference?.key) {
      await deleteStoredFile(productReference.key).catch(console.error);
    }

    throw error;
  }

  return hydrateProductReferenceUrl(order.toObject());
}

export async function listOrders({ filter = {} } = {}) {
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return hydrateOrdersProductReferenceUrls(orders);
}

export async function getOrderById(orderId) {
  const order = await Order.findById(orderId).lean();

  if (!order) {
    throw createHttpError(404, 'Order not found.');
  }

  return hydrateProductReferenceUrl(order);
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
  const result = await acceptOrderWorkflow({
    orderId,
    readyDays,
    createdBy: userId,
  });

  return {
    ...result,
    order: await hydrateProductReferenceUrl(result.order),
  };
}

export async function addProductionProgress({ orderId, note, userId }) {
  const result = await addOrderProgressUpdate({
    orderId,
    note,
    createdBy: userId,
  });

  return {
    ...result,
    order: await hydrateProductReferenceUrl(result.order),
  };
}

export async function markProductionReady({ orderId, items, userId }) {
  const result = await markOrderReady({
    orderId,
    items,
    createdBy: userId,
  });

  return {
    ...result,
    order: await hydrateProductReferenceUrl(result.order),
  };
}

export async function assignOrderItemNumbers({ orderId, items }) {
  const order = await assignOrderItemNumbersWorkflow({
    orderId,
    items,
  });

  return hydrateProductReferenceUrl(order);
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
    order: await hydrateProductReferenceUrl(dispatchedOrder),
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
