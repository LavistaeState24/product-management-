import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import CustomerReceivable from '../models/CustomerReceivable.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import { createHttpError } from '../utils/httpError.js';
import { formatSale } from '../utils/formatSale.js';
import { resolveSaleItemStock } from './salestockResolver.js';
import { roundCurrency } from '../utils/saleMath.js';

function normalizeName(name = '') {
  return name.trim().toLowerCase();
}

function formatInvoiceDatePart(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
}

export async function resolveCustomerByName(name) {
  const normalizedName = normalizeName(name);
  let customer = await Customer.findOne({ normalizedName });

  if (!customer) {
    customer = await Customer.create({
      name,
      normalizedName,
    });
  }

  return customer;
}

export async function resolveCustomerByNameInSession(name, session) {
  const normalizedName = normalizeName(name);
  let customer = await Customer.findOne({ normalizedName }).session(session);

  if (!customer) {
    [customer] = await Customer.create(
      [
        {
          name,
          normalizedName,
        },
      ],
      { session },
    );
  }

  return customer;
}

export async function resolveProductForSale(name, session) {
  const normalizedName = normalizeName(name);
  let query = Product.findOne({
    normalizedName,
    isActive: true,
  });
  if (session) {
    query = query.session(session);
  }

  const product = await query;

  if (!product) {
    throw createHttpError(404, `Product "${name}" was not found.`);
  }

  return product;
}

export function assertSufficientStock({ product, requiredQuantity, restorableQuantity = 0 }) {
  const availableQuantity = roundCurrency(product.currentStock + restorableQuantity);

  if (availableQuantity < requiredQuantity) {
    throw createHttpError(
      400,
      `Insufficient stock for "${product.name}". Available: ${availableQuantity}, required: ${requiredQuantity}.`,
    );
  }
}

export async function adjustProductStock(productId, delta) {
  return adjustProductStockInSession(productId, delta);
}

export async function adjustProductStockInSession(productId, delta, session) {
  let query = Product.findById(productId);
  if (session) {
    query = query.session(session);
  }

  const product = await query;

  if (!product) {
    throw createHttpError(404, 'Product not found.');
  }

  const nextStock = roundCurrency(product.currentStock + delta);

  if (nextStock < 0) {
    throw createHttpError(
      400,
      `Unable to update stock for "${product.name}" because it would become negative.`,
    );
  }

  product.currentStock = nextStock;
  await product.save({ session });
}

export async function generateInvoiceNumber(invoiceDate, session) {
  const prefix = `SAL-${formatInvoiceDatePart(invoiceDate)}`;
  const pattern = new RegExp(`^${prefix}-\\d{4}$`);
  let query = Sale.findOne({
    invoiceNumber: pattern,
  })
    .sort({ invoiceNumber: -1 })
    .select('invoiceNumber');

  if (session) {
    query = query.session(session);
  }

  const lastSale = await query.lean();

  const lastSequence = lastSale
    ? Number(lastSale.invoiceNumber.split('-').at(-1))
    : 0;

  return `${prefix}-${String(lastSequence + 1).padStart(4, '0')}`;
}

export async function syncCustomerOutstanding(customerId) {
  return syncCustomerOutstandingInSession(customerId);
}

export async function syncCustomerOutstandingInSession(customerId, session) {
  const normalizedCustomerId =
    typeof customerId === 'string' ? new mongoose.Types.ObjectId(customerId) : customerId;

  const [aggregate] = await CustomerReceivable.aggregate([
    {
      $match: {
        customer: normalizedCustomerId,
      },
    },
    {
      $group: {
        _id: '$customer',
        total: { $sum: '$amount' },
      },
    },
  ]).session(session);

  await Customer.findByIdAndUpdate(
    normalizedCustomerId,
    {
      outstandingReceivable: roundCurrency(aggregate?.total || 0),
    },
    { session },
  );
}

export async function syncReceivableForSale({
  saleId,
  customerId,
  paymentType,
  outstandingAmount,
  session,
}) {
  if (paymentType !== 'Credit') {
    await CustomerReceivable.findOneAndDelete({ sale: saleId }).session(session);
    await syncCustomerOutstandingInSession(customerId, session);
    return;
  }

  await CustomerReceivable.findOneAndUpdate(
    { sale: saleId },
    {
      customer: customerId,
      sale: saleId,
      amount: roundCurrency(outstandingAmount),
      status: outstandingAmount > 0 ? 'pending' : 'settled',
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      session,
    },
  );

  await syncCustomerOutstandingInSession(customerId, session);
}

export async function runSalesTransaction(work) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await work(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export async function getSaleById(saleId) {
  const sale = await Sale.findById(saleId)
    .populate('customer')
    .populate('product')
    .lean();

  if (!sale) {
    throw createHttpError(404, 'Sale not found.');
  }

  const enrichedItems = await Promise.all(
    (sale.items || []).map(async (item) => {
      const stockDetails =
        await resolveSaleItemStock(item);

      return {
        ...item,
        currentStock: stockDetails.currentStock,
        itemNumber: item.itemNumber || stockDetails.itemNumber || '',
        productName: item.productName || stockDetails.productName || '',
        size: item.size || stockDetails.size || '',
        colour: item.colour || stockDetails.colour || '',
        weight: item.weight ?? stockDetails.weight ?? null,
        sellingUnit: item.sellingUnit || stockDetails.sellingUnit || '',
      };
    }),
  );
  const saleWithSnapshots = {
    ...sale,
    items: enrichedItems.length ? enrichedItems : sale.items,
  };
  const formattedSale = formatSale(saleWithSnapshots);

  return {
    ...formattedSale,
    ...sale,
    ...formattedSale,
    id: String(sale._id),
    _id: sale._id,
    items: formattedSale.items,
    companySettings: null,
    printableInvoice: {
      companySettings: null,
      customer: {
        id: formattedSale.customer?.id || null,
        name: formattedSale.customerName || formattedSale.customer?.name || '',
        mobile: formattedSale.customerMobile || '',
        address: formattedSale.customerAddress || '',
        location: formattedSale.customerLocation || '',
        gst: formattedSale.customerGST || '',
      },
      items: formattedSale.items,
      totals: {
        subtotal: formattedSale.subtotal,
        gstAmount: formattedSale.gstAmount,
        grandTotal: formattedSale.grandTotal,
        paidAmount: formattedSale.paidAmount,
        outstandingAmount: formattedSale.outstandingAmount,
        freightCharges: formattedSale.freightCharges || 0,
        roundOff: formattedSale.roundOff || 0,
      },
      paymentDetails: formattedSale.paymentDetails || {},
      transportDetails: {
        ...(formattedSale.transportDetails || {}),
        transportName: formattedSale.transportName || '',
        vehicleNumber: formattedSale.vehicleNumber || '',
        deliveryNote: formattedSale.deliveryNote || '',
        referenceNumber: formattedSale.referenceNumber || '',
        referenceDate: formattedSale.referenceDate || null,
        buyerOrderNumber: formattedSale.buyerOrderNumber || '',
        buyerOrderDate: formattedSale.buyerOrderDate || null,
        dispatchDocumentNumber: formattedSale.dispatchDocumentNumber || '',
        dispatchThrough: formattedSale.dispatchThrough || '',
        dispatchDate: formattedSale.dispatchDate || null,
        destination: formattedSale.destination || '',
        termsOfDelivery: formattedSale.termsOfDelivery || '',
      },
      bankDetails: formattedSale.bankDetails || {},
      termsAndConditions: formattedSale.termsAndConditions || [],
      cancellation: {
        invoiceStatus: formattedSale.invoiceStatus,
        cancellationReason: formattedSale.cancellationReason || '',
        cancelledBy: formattedSale.cancelledBy || null,
        cancelledAt: formattedSale.cancelledAt || null,
      },
    },
  };
}
