import mongoose from 'mongoose';

function normalizeName(name = '') {
  return name.trim().toLowerCase();
}

const rawMaterialStockSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedItemName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    unit: {
      type: String,
      enum: ['Kg', 'PCS'],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

rawMaterialStockSchema.index({ normalizedItemName: 1, unit: 1 }, { unique: true });

rawMaterialStockSchema.pre('validate', function syncNormalizedItemName(next) {
  this.normalizedItemName = normalizeName(this.itemName);
  next();
});

const RawMaterialStock = mongoose.model('RawMaterialStock', rawMaterialStockSchema);

export default RawMaterialStock;
