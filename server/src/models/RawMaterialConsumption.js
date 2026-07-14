import mongoose from 'mongoose';

const rawMaterialConsumptionSchema = new mongoose.Schema(
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
    rodProductionBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RodProductionBatch',
      index: true,
    },
    sheetProductionBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SheetProductionBatch',
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

rawMaterialConsumptionSchema.pre('validate', function requireProductionBatchReference(next) {
  if (!this.rodProductionBatchId && !this.sheetProductionBatchId) {
    next(new Error('Raw material consumption must reference a production batch.'));
    return;
  }

  next();
});

const RawMaterialConsumption = mongoose.model(
  'RawMaterialConsumption',
  rawMaterialConsumptionSchema,
);

export default RawMaterialConsumption;
