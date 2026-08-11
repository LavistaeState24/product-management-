import {
  acceptOrder,
  addProductionProgress,
  assignOrderItemNumbers,
  confirmNotificationForClient,
  createOrder,
  dispatchOrder,
  getOrderById,
  getOrCreateAcceptedMessageLog,
  listOrders,
  listClientMessageLogs,
  listOrderNotifications,
  listProductionActiveOrders,
  listProductionOrders,
  listProductionPendingOrders,
  listReadyForDispatchOrders,
  markProductionReady,
  markNotificationSeen,
  openMessageInWhatsApp,
} from '../services/orderService.js';
import {
  serializeOrderForBoss,
  serializeOrderForProduction,
} from '../utils/formatOrder.js';
import { PERMISSIONS, ROLES } from '../utils/permissions.js';

function canViewOrderClientDetails(user) {
  if (user?.role === ROLES.Boss) {
    return true;
  }

  return Array.isArray(user?.permissions)
    ? user.permissions.includes(PERMISSIONS.canViewOrderClientDetails)
    : false;
}

export function serializeOrderForUser(order, user) {
  return canViewOrderClientDetails(user)
    ? serializeOrderForBoss(order)
    : serializeOrderForProduction(order);
}

function serializeNotification(notification) {
  return {
    id: notification._id,
    order: notification.order,
    orderNo: notification.orderNo,
    audience: notification.audience,
    kind: notification.kind,
    message: notification.message,
    seen: notification.seen,
    seenAt: notification.seenAt,
    clientConfirmed: notification.clientConfirmed,
    clientConfirmedAt: notification.clientConfirmedAt,
    createdBy: notification.createdBy,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

function serializeMessageLog(messageLog) {
  return {
    id: messageLog._id,
    order: messageLog.order,
    orderNo: messageLog.orderNo,
    clientName: messageLog.clientName,
    clientMobile: messageLog.clientMobile,
    kind: messageLog.kind,
    message: messageLog.message,
    channel: messageLog.channel,
    status: messageLog.status,
    whatsappOpenedAt: messageLog.whatsappOpenedAt,
    createdBy: messageLog.createdBy,
    createdAt: messageLog.createdAt,
    updatedAt: messageLog.updatedAt,
  };
}

export async function createOrderController(req, res) {
  const order = await createOrder(req.body, req.user._id, req.file);

  return res.status(201).json({
    message: 'Order created successfully.',
    order: serializeOrderForUser(order, req.user),
  });
}

export async function listOrdersController(req, res) {
  const orders = await listOrders();

  return res.status(200).json({
    items: orders.map((order) => serializeOrderForUser(order, req.user)),
  });
}

export async function listReadyForDispatchOrdersController(req, res) {
  const orders = await listReadyForDispatchOrders();

  return res.status(200).json({
    items: orders.map((order) => serializeOrderForUser(order, req.user)),
  });
}

export async function getOrderController(req, res) {
  const order = await getOrderById(req.params.orderId);

  return res.status(200).json({
    order: serializeOrderForUser(order, req.user),
  });
}

export async function listProductionPendingOrdersController(req, res) {
  const orders = await listProductionPendingOrders();

  return res.status(200).json({
    items: orders.map(serializeOrderForProduction),
  });
}

export async function listProductionActiveOrdersController(req, res) {
  const orders = await listProductionActiveOrders();

  return res.status(200).json({
    items: orders.map(serializeOrderForProduction),
  });
}

export async function listProductionOrdersController(req, res) {
  const orders = await listProductionOrders();

  return res.status(200).json({
    items: orders.map(serializeOrderForProduction),
  });
}

export async function getProductionOrderController(req, res) {
  const order = await getOrderById(req.params.orderId);

  return res.status(200).json({
    order: serializeOrderForProduction(order),
  });
}

export async function acceptOrderController(req, res) {
  const { order } = await acceptOrder({
    orderId: req.params.orderId,
    readyDays: req.body.readyDays,
    userId: req.user._id,
  });

  return res.status(200).json({
    message: 'Order accepted successfully.',
    order: serializeOrderForProduction(order),
  });
}

export async function addProductionProgressController(req, res) {
  const { order } = await addProductionProgress({
    orderId: req.params.orderId,
    note: req.body.note,
    userId: req.user._id,
  });

  return res.status(200).json({
    message: 'Progress update added successfully.',
    order: serializeOrderForProduction(order),
  });
}

export async function markProductionReadyController(req, res) {
  const { order } = await markProductionReady({
    orderId: req.params.orderId,
    items: req.body.items,
    userId: req.user._id,
  });

  return res.status(200).json({
    message: 'Order marked Ready successfully.',
    order: serializeOrderForProduction(order),
  });
}

export async function assignOrderItemNumbersController(req, res) {
  const order = await assignOrderItemNumbers({
    orderId: req.params.orderId,
    items: req.body.items,
  });

  return res.status(200).json({
    message: 'Item numbers assigned successfully.',
    order: serializeOrderForProduction(order),
  });
}

export async function dispatchOrderController(req, res) {
  const { order, messageLog } = await dispatchOrder({
    orderId: req.params.orderId,
    userId: req.user._id,
  });

  return res.status(200).json({
    message: 'Dispatch message prepared in Message Center.',
    order: serializeOrderForUser(order, req.user),
    messageLog: serializeMessageLog(messageLog),
  });
}

export async function listOrderNotificationsController(req, res) {
  const notifications = await listOrderNotifications();

  return res.status(200).json({
    items: notifications.map(serializeNotification),
  });
}

export async function markNotificationSeenController(req, res) {
  const notification = await markNotificationSeen(req.params.notificationId);

  return res.status(200).json({
    notification: serializeNotification(notification),
  });
}

export async function confirmNotificationForClientController(req, res) {
  const notification = await confirmNotificationForClient(
    req.params.notificationId,
  );

  return res.status(200).json({
    notification: serializeNotification(notification),
  });
}

export async function prepareAcceptedClientMessageController(req, res) {
  const messageLog = await getOrCreateAcceptedMessageLog({
    notificationId: req.params.notificationId,
    userId: req.user._id,
  });

  return res.status(200).json({
    messageLog: serializeMessageLog(messageLog),
  });
}

export async function listClientMessageLogsController(req, res) {
  const messageLogs = await listClientMessageLogs();

  return res.status(200).json({
    items: messageLogs.map(serializeMessageLog),
  });
}

export async function openMessageInWhatsAppController(req, res) {
  const { messageLog, whatsappUrl } = await openMessageInWhatsApp(
    req.params.messageLogId,
  );

  return res.status(200).json({
    messageLog: serializeMessageLog(messageLog),
    whatsappUrl,
  });
}
