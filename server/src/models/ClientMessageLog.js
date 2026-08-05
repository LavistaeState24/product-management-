import mongoose from 'mongoose';

export const CLIENT_MESSAGE_KINDS = Object.freeze([
  'order_accepted',
  'ready_for_dispatch',
]);

export const CLIENT_MESSAGE_CHANNELS = Object.freeze([
  'whatsapp_manual',
]);

export const CLIENT_MESSAGE_STATUSES = Object.freeze([
  'draft',
  'opened',
]);

const clientMessageLogSchema = new mongoose.Schema(
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
    clientName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    clientMobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    kind: {
      type: String,
      enum: CLIENT_MESSAGE_KINDS,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: CLIENT_MESSAGE_CHANNELS,
      default: 'whatsapp_manual',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: CLIENT_MESSAGE_STATUSES,
      default: 'draft',
      required: true,
      index: true,
    },
    whatsappOpenedAt: {
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

clientMessageLogSchema.index(
  { order: 1, kind: 1 },
  { unique: true },
);
clientMessageLogSchema.index({ status: 1, createdAt: -1 });

const ClientMessageLog = mongoose.model(
  'ClientMessageLog',
  clientMessageLogSchema,
);

export default ClientMessageLog;