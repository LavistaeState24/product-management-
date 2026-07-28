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
    supplierAddress: {
      type: String,
      trim: true,
      default: '',
    },
    supplierLocation: {
      type: String,
      trim: true,
      default: '',
    },
    gstNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
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
    purchaseType: {
      type: String,
      enum: ['Raw Material', 'PU Chemical'],
      required: true,
      default: 'Raw Material',
      index: true,
    },
    itemName: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    unit: {
      type: String,
      enum: ['Kg', 'PCS'],
      default: undefined,
      index: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      index: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
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
    pricePerUnit: {
      type: Number,
      min: 0,
      default: null,
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
      enum: ['Cash', 'Cheque', 'Credit', 'Advance'],
      required: true,
      index: true,
    },
    creditDueDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    bill: {
      type: {
        originalName: {
          type: String,
          trim: true,
          default: null,
        },
        filename: {
          type: String,
          trim: true,
          default: null,
        },
        mimeType: {
          type: String,
          enum: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
          default: null,
        },
        size: {
          type: Number,
          min: 0,
          max: 10 * 1024 * 1024,
          default: null,
        },
        storagePath: {
          type: String,
          trim: true,
          default: null,
        },
        url: {
          type: String,
          default: null,
        },
        uploadedAt: {
          type: Date,
          default: null,
        },
      },
      default: null,
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
    remarks: {
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

purchaseSchema.index({
  supplierName: 1,
  productName: 1,
  purchaseDate: -1,
});

purchaseSchema.index({
  purchaseType: 1,
  purchaseDate: -1,
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
