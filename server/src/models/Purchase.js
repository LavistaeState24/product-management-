import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    basicAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    gstType: {
      type: String,
      enum: ['None', 'CGST_SGST', 'IGST'],
      required: true,
      index: true,
    },
    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      required: true,
      min: 0,
    },
    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    cgstAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    sgstAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    igstAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentType: {
      type: String,
      enum: ['Cash', 'Credit'],
      required: true,
      index: true,
    },
    creditDueDate: {
      type: Date,
      default: null,
    },
    bill: {
      originalName: {
        type: String,
        default: null,
      },
      filename: {
        type: String,
        default: null,
      },
      mimeType: {
        type: String,
        default: null,
      },
      size: {
        type: Number,
        default: null,
      },
      storagePath: {
        type: String,
        default: null,
      },
      url: {
        type: String,
        default: null,
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
