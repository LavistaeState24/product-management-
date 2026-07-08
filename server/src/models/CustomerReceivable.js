import mongoose from 'mongoose';

const customerReceivableSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
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

const CustomerReceivable = mongoose.model('CustomerReceivable', customerReceivableSchema);

export default CustomerReceivable;
