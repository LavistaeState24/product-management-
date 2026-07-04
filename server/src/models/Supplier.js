import mongoose from 'mongoose';

function normalizeName(name = '') {
  return name.trim().toLowerCase();
}

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    outstandingPayable: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

supplierSchema.pre('validate', function syncNormalizedName(next) {
  this.normalizedName = normalizeName(this.name);
  next();
});

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;
