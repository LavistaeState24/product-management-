import mongoose from 'mongoose';

const rodProductStockSchema = new mongoose.Schema(
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
      ref: 'RodProductManufacturingBatch',
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

rodProductStockSchema.index({ productName: 1, size: 1, colour: 1 });

const RodProductStock = mongoose.model('RodProductStock', rodProductStockSchema);

export default RodProductStock;
