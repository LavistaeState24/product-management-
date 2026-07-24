import mongoose from 'mongoose';

const paymentHistorySchema = new mongoose.Schema(
  {
    referenceType: {
      type: String,
      enum: ['Purchase', 'Sale'],
      required: true,
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'referenceType',
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Cheque'],
      required: true,
      index: true,
    },
    chequeNumber: {
      type: String,
      trim: true,
      default: '',
    },
    chequeDate: {
      type: Date,
      default: null,
    },
    bankName: {
      type: String,
      trim: true,
      default: '',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

paymentHistorySchema.index({ referenceType: 1, referenceId: 1, paymentDate: -1 });

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);

export default PaymentHistory;
