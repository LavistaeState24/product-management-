import {
  acceptOrder,
  createOrder,
  getOrderById,
  listOrders,
  listProductionActiveOrders,
  listProductionOrders,
  listProductionPendingOrders,
} from '../services/orderService.js';
import {
  serializeOrderForBoss,
  serializeOrderForProduction,
} from '../utils/formatOrder.js';

export async function createOrderController(req, res) {
  const order = await createOrder(req.body, req.user._id);

  return res.status(201).json({
    message: 'Order created successfully.',
    order: serializeOrderForBoss(order),
  });
}

export async function listOrdersController(req, res) {
  const orders = await listOrders();

  return res.status(200).json({
    items: orders.map(serializeOrderForBoss),
  });
}

export async function getOrderController(req, res) {
  const order = await getOrderById(req.params.orderId);

  return res.status(200).json({
    order: serializeOrderForBoss(order),
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
  const { order, notification } = await acceptOrder({
    orderId: req.params.orderId,
    readyDays: req.body.readyDays,
    userId: req.user._id,
  });

  return res.status(200).json({
    message: 'Order accepted successfully.',
    order: serializeOrderForProduction(order),
    notification: {
      id: notification._id,
      order: notification.order,
      orderNo: notification.orderNo,
      audience: notification.audience,
      kind: notification.kind,
      message: notification.message,
      seen: notification.seen,
      clientConfirmed: notification.clientConfirmed,
      createdBy: notification.createdBy,
      createdAt: notification.createdAt,
    },
  });
}
