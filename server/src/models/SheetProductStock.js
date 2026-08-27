import mongoose from 'mongoose';

const sheetProductStockSchema = new mongoose.Schema(
  {
    itemNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
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
    drawingNumber: {
      type: String,
      trim: true,
      default: '',
    },
    photo: {
      type: String,
      trim: true,
      default: '',
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
      min: 0,
    },
    productionDate: {
      type: Date,
      required: true,
      index: true,
    },
    manufacturingBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SheetProductManufacturingBatch',
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

sheetProductStockSchema.index({ productName: 1, size: 1, colour: 1 });

const SheetProductStock = mongoose.model('SheetProductStock', sheetProductStockSchema);

export default SheetProductStock;
