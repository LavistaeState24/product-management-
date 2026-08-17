import { createHttpError } from './httpError.js';

export const ORDER_STATUS_TRANSITIONS = Object.freeze({
  pending: ['accepted'],
  accepted: ['in_production', 'ready'],
  in_production: ['in_production', 'ready'],
  ready: ['dispatched'],
  dispatched: [],
});

export function assertOrderStatusTransition(fromStatus, toStatus) {
  const allowedTargets = ORDER_STATUS_TRANSITIONS[fromStatus] || [];

  if (!allowedTargets.includes(toStatus)) {
    throw createHttpError(
      422,
      `Order status cannot move from ${fromStatus} to ${toStatus}.`,
    );
  }
}

export function formatReadyByDate(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function buildAcceptedClientMessage(order) {
  return [
    `Namaste ${order.clientName}, aapka order ${order.orderNo} accept ho gaya hai. Aapka order expected ${formatReadyByDate(order.readyByDate)} tak ready ho jayega.`,
    '',
    'Thank you,',
    'Customized Polycast Pvt. Ltd.',
  ].join('\n');
}

export function buildReadyForDispatchClientMessage(order) {
  return [
    `Namaste ${order.clientName}, aapka order ${order.orderNo} ready hai aur dispatch ke liye submit kar diya gaya hai.`,
    '',
    'Delivery coordination ke liye hamari team se sampark me rahein.',
    '',
    'Thank you,',
    'Customized Polycast Pvt. Ltd.',
  ].join('\n');
}

export function buildOrderNotificationMessage({ order, kind, note }) {
  if (kind === 'accepted') {
    return `Order ${order.orderNo} accepted for ${order.clientName}.`;
  }

  if (kind === 'ready') {
    return `Order ${order.orderNo} is ready for dispatch.`;
  }

  return note || `Progress update added for order ${order.orderNo}.`;
}

export function normalizeIndianWhatsAppPhone(value) {
  const digits = String(value || '').replace(/[\s+\-()]/g, '');

  if (/^[6-9]\d{9}$/.test(digits)) {
    return `91${digits}`;
  }

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  throw createHttpError(422, 'Client mobile must be a valid Indian mobile number.');
}

export function buildWhatsAppDeepLink({ clientMobile, message }) {
  const phone = normalizeIndianWhatsAppPhone(clientMobile);
  const text = encodeURIComponent(message);

  return `https://wa.me/${phone}?text=${text}`;
}