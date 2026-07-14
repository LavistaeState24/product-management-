import mongoose from 'mongoose';

const sheetProductionItemSchema = new mongoose.Schema(
  {
    itemNumber: {
      type: String,
      required: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
    },
    colour: {
      type: String,
      required: true,
      trim: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0.01,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

const sheetProductionBatchSchema = new mongoose.Schema(
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
    sheets: {
      type: [sheetProductionItemSchema],
      default: [],
      validate: {
        validator(sheets) {
          return sheets.length > 0;
        },
        message: 'At least one sheet item is required.',
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
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

const SheetProductionBatch = mongoose.model('SheetProductionBatch', sheetProductionBatchSchema);

export default SheetProductionBatch;
