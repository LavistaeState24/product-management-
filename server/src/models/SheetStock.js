import mongoose from 'mongoose';

const sheetStockSchema = new mongoose.Schema(
  {
    itemNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    itemName: {
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
    weight: {
      type: Number,
      required: true,
      min: 0.01,
      index: true,
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
      ref: 'SheetProductionBatch',
      required: true,
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

sheetStockSchema.index({ itemName: 1, size: 1, colour: 1 });

const SheetStock = mongoose.model('SheetStock', sheetStockSchema);

export default SheetStock;
