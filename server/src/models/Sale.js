import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    customerMobile: {
      type: String,
      trim: true,
      default: '',
    },
    customerAddress: {
      type: String,
      trim: true,
      default: '',
    },
    customerLocation: {
      type: String,
      trim: true,
      default: '',
    },
    customerGST: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    sellingPrice: {
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
    outstandingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    invoiceStatus: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Unpaid', 'Cancelled'],
      required: true,
      index: true,
    },
    partyDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    gstDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    transportDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    transportName: {
      type: String,
      trim: true,
      default: '',
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    bankDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    termsAndConditions: {
      type: [String],
      default: [],
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    subtotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    gstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    grandTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    paid: {
      type: Number,
      min: 0,
      default: 0,
    },
    outstanding: {
      type: Number,
      min: 0,
      default: 0,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    creditDays: {
      type: Number,
      min: 0,
      default: 0,
    },
    parcelCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Unpaid', 'Cancelled'],
      default: 'Paid',
      index: true,
    },
    items: {
      type: [
        {
          stockType: {
            type: String,
            enum: ['rod', 'sheet', 'pu-product', 'legacy-product'],
            required: true,
            index: true,
          },
          stockRef: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
          },
          itemNumber: {
            type: String,
            trim: true,
            default: '',
          },
          productName: {
            type: String,
            required: true,
            trim: true,
          },
          size: {
            type: String,
            trim: true,
            default: '',
          },
          colour: {
            type: String,
            trim: true,
            default: '',
          },
          weight: {
            type: Number,
            default: null,
          },
          sellingUnit: {
            type: String,
            trim: true,
            default: '',
          },
          quantity: {
            type: Number,
            required: true,
            min: 0.01,
          },
          sellingPrice: {
            type: Number,
            required: true,
            min: 0,
          },
          gstRate: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
          },
          lineSubtotal: {
            type: Number,
            required: true,
            min: 0,
          },
          gstAmount: {
            type: Number,
            required: true,
            min: 0,
          },
          lineTotal: {
            type: Number,
            required: true,
            min: 0,
          },
          stockBeforeSale: {
            type: Number,
            min: 0,
          },

          stockAfterSale: {
            type: Number,
            min: 0,
          },
        },
      ],
      default: [],
    },
    payments: {
      type: [
        {
          amount: {
            type: Number,
            required: true,
            min: 0.01,
          },
          paymentDate: {
            type: Date,
            required: true,
          },
          paymentType: {
            type: String,
            enum: ['Cash', 'Cheque'],
            default: 'Cash',
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
        },
      ],
      default: [],
    },
    cancellationDetails: {
      reason: {
        type: String,
        trim: true,
        default: '',
      },
      cancelledAt: {
        type: Date,
        default: null,
      },
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      stockRestored: {
        type: Boolean,
        default: false,
      },
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
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

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
