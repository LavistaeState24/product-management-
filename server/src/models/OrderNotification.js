import mongoose from 'mongoose';

export const ORDER_NOTIFICATION_KINDS = Object.freeze([
  'accepted',
  'progress',
  'ready',
]);

const orderNotificationSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    audience: {
      type: String,
      enum: ['boss'],
      default: 'boss',
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ORDER_NOTIFICATION_KINDS,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    seen: {
      type: Boolean,
      default: false,
      index: true,
    },
    seenAt: {
      type: Date,
      default: null,
    },
    clientConfirmed: {
      type: Boolean,
      default: false,
      index: true,
    },
    clientConfirmedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

orderNotificationSchema.index({ audience: 1, seen: 1, createdAt: -1 });
orderNotificationSchema.index({ order: 1, kind: 1, createdAt: -1 });

const OrderNotification = mongoose.model(
  'OrderNotification',
  orderNotificationSchema,
);

export default OrderNotification;

