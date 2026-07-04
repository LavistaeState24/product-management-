import mongoose from 'mongoose';

const supplierPayableSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'settled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  },
);

const SupplierPayable = mongoose.model('SupplierPayable', supplierPayableSchema);

export default SupplierPayable;
