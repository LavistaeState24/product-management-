
import Order from '../models/Order.js';
import { createHttpError } from '../utils/httpError.js';
import { acceptOrder as acceptOrderWorkflow } from './orderWorkflowService.js';

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

export async function acceptOrder({ orderId, readyDays, userId }) {
  return acceptOrderWorkflow({
    orderId,
    readyDays,
    createdBy: userId,
  });
}