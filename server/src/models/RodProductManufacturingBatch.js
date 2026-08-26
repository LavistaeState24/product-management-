import mongoose from 'mongoose';

const rodProductManufacturingBatchSchema = new mongoose.Schema(
  {
    rodItem: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    rodStockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RodStock',
      required: true,
      index: true,
    },
    quantityUsed: {
      type: Number,
      required: true,
      min: 0.01,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    colour: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sellingUnit: {
      type: String,
      enum: ['Per PCS', 'Per Kg'],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    itemNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    dateTime: {
      type: Date,
      required: true,
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    batchId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const RodProductManufacturingBatch = mongoose.model(
  'RodProductManufacturingBatch',
  rodProductManufacturingBatchSchema,
);

export default RodProductManufacturingBatch;
