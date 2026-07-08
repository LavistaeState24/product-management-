import mongoose from 'mongoose';

function normalizeName(name = '') {
  return name.trim().toLowerCase();
}

const customerSchema = new mongoose.Schema(
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
    outstandingReceivable: {
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

customerSchema.pre('validate', function syncNormalizedName(next) {
  this.normalizedName = normalizeName(this.name);
  next();
});

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
