import mongoose from 'mongoose';

function normalizeName(name = '') {
  return name.trim().toLowerCase();
}

const puChemicalStockSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: ['PU Chemical', 'Mocha Chemical'],
      default: 'PU Chemical',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

puChemicalStockSchema.index({ normalizedItemName: 1, unit: 1 }, { unique: true });

puChemicalStockSchema.pre('validate', function syncNormalizedItemName(next) {
  this.normalizedItemName = normalizeName(this.itemName);
  next();
});

const PuChemicalStock = mongoose.model('PuChemicalStock', puChemicalStockSchema);

export default PuChemicalStock;