import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import CustomerReceivable from '../models/CustomerReceivable.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import { createHttpError } from '../utils/httpError.js';
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

export async function resolveProductForSale(name) {
  const normalizedName = normalizeName(name);
  const product = await Product.findOne({
    normalizedName,
    isActive: true,
  });

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
  const product = await Product.findById(productId);

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
  await product.save();
}

export async function generateInvoiceNumber(invoiceDate) {
  const prefix = `SAL-${formatInvoiceDatePart(invoiceDate)}`;
  const pattern = new RegExp(`^${prefix}-\\d{4}$`);
  const lastSale = await Sale.findOne({
    invoiceNumber: pattern,
  })
    .sort({ invoiceNumber: -1 })
    .select('invoiceNumber')
    .lean();

  const lastSequence = lastSale
    ? Number(lastSale.invoiceNumber.split('-').at(-1))
    : 0;

  return `${prefix}-${String(lastSequence + 1).padStart(4, '0')}`;
}

export async function syncCustomerOutstanding(customerId) {
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
  ]);

  await Customer.findByIdAndUpdate(normalizedCustomerId, {
    outstandingReceivable: roundCurrency(aggregate?.total || 0),
  });
}

export async function syncReceivableForSale({
  saleId,
  customerId,
  paymentType,
  outstandingAmount,
}) {
  if (paymentType !== 'Credit') {
    await CustomerReceivable.findOneAndDelete({ sale: saleId });
    await syncCustomerOutstanding(customerId);
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
    },
  );

  await syncCustomerOutstanding(customerId);
}
