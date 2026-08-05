import mongoose from 'mongoose';
import { generateOrderNo } from '../utils/orderNumber.js';

export const ORDER_STATUSES = Object.freeze([
  'pending',
  'accepted',
  'in_production',
  'ready',
  'dispatched',
]);

export const ORDER_STOCK_TYPES = Object.freeze([
  'rod',
  'sheet',
  'pu-product',
  'finished-goods',
  'manual',
]);

const orderItemSchema = new mongoose.Schema(
  {
    itemDesc: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
      default: '',
    },
    colour: {
      type: String,
      trim: true,
      default: '',
    },
    hardness: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    itemNo: {
      type: String,
      trim: true,
      default: '',
    },
    stockType: {
      type: String,
      enum: ORDER_STOCK_TYPES,
      default: 'manual',
      index: true,
    },
    stockRef: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
      validate: {
        validator(value) {
          return this.stockType === 'manual' || value != null;
        },
        message: 'Stock reference is required for stock-linked order items.',
      },
    },
  },
  {
    _id: false,
  },
);

const dailyUpdateSchema = new mongoose.Schema(
  {
    note: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
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
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'At least one order item is required.',
      },
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending',
      required: true,
      index: true,
    },
    readyDays: {
      type: Number,
      default: null,
      validate: {
        validator(value) {
          return value == null || (Number.isInteger(value) && value > 0);
        },
        message: 'Ready days must be a positive integer.',
      },
    },
    acceptedAt: {
      type: Date,
      default: null,
      index: true,
    },
    readyByDate: {
      type: Date,
      default: null,
      index: true,
    },
    dailyUpdates: {
      type: [dailyUpdateSchema],
      default: [],
    },
    dispatchedAt: {
      type: Date,
      default: null,
      index: true,
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

orderSchema.index({ status: 1, readyByDate: 1 });
orderSchema.index({ clientName: 1, clientMobile: 1 });
orderSchema.index({ 'items.stockType': 1, 'items.stockRef': 1 });
orderSchema.index({ 'items.itemNo': 1 });

orderSchema.pre('validate', async function assignOrderNo() {
  if (!this.isNew || this.$locals.orderNoGenerated) {
    return;
  }

  this.orderNo = await generateOrderNo({
    session: this.$session(),
  });
  this.$locals.orderNoGenerated = true;
});

orderSchema.pre('validate', function validateStatusRules(next) {
  if (['ready', 'dispatched'].includes(this.status)) {
    const missingItemNumberIndex = this.items.findIndex(
      (item) => !item.itemNo,
    );

    if (missingItemNumberIndex !== -1) {
      this.invalidate(
        `items.${missingItemNumberIndex}.itemNo`,
        'Every item needs an item number before Ready.',
      );
    }
  }

  if (this.status === 'dispatched' && !this.dispatchedAt) {
    this.invalidate(
      'dispatchedAt',
      'Dispatched order requires dispatchedAt.',
    );
  }

  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;