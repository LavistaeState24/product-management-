import mongoose from 'mongoose';

function normalizeName(name = '') {
  return name.trim().toLowerCase();
}

const productSchema = new mongoose.Schema(
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
    currentStock: {
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

productSchema.pre('validate', function syncNormalizedName(next) {
  this.normalizedName = normalizeName(this.name);
  next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;
