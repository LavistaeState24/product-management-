import mongoose from 'mongoose';

const rodStockSchema = new mongoose.Schema(
  {
    itemNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    item: {
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
    weightKg: {
      type: Number,
      required: true,
      min: 0.01,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    productionDate: {
      type: Date,
      required: true,
      index: true,
    },
    productionBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RodProductionBatch',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

rodStockSchema.index({ item: 1, size: 1, colour: 1 });

const RodStock = mongoose.model('RodStock', rodStockSchema);

export default RodStock;
