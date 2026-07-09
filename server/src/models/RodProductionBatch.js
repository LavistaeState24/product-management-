import mongoose from 'mongoose';

const rodProductionItemSchema = new mongoose.Schema(
  {
    item: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
    },
    weightKg: {
      type: Number,
      required: true,
      min: 0.01,
    },
    colour: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    itemNumber: {
      type: String,
      required: true,
      trim: true,
    },
    isManualItemNumber: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const rodProductionBatchSchema = new mongoose.Schema(
  {
    rawMaterialItem: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    rawMaterialStockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterialStock',
      required: true,
      index: true,
    },
    quantityUsed: {
      type: Number,
      required: true,
      min: 0.01,
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
    rods: {
      type: [rodProductionItemSchema],
      default: [],
      validate: {
        validator(rods) {
          return rods.length > 0;
        },
        message: 'At least one rod item is required.',
      },
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

const RodProductionBatch = mongoose.model('RodProductionBatch', rodProductionBatchSchema);

export default RodProductionBatch;
