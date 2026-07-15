import mongoose from 'mongoose';

const puProductManufacturingBatchSchema = new mongoose.Schema(
  {
    puChemicalItem: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    puChemicalStockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PuChemicalStock',
      required: true,
      index: true,
    },
    chemicalQuantityKg: {
      type: Number,
      required: true,
      min: 0.01,
    },
    mocaItem: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    mocaStockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PuChemicalStock',
      required: true,
      index: true,
    },
    mocaQuantityKg: {
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

const PUProductManufacturingBatch = mongoose.model(
  'PUProductManufacturingBatch',
  puProductManufacturingBatchSchema,
);

export default PUProductManufacturingBatch;
