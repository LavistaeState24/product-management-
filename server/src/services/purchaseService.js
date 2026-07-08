import mongoose from 'mongoose';
import Product from '../models/Product.js';
import RawMaterialStock from '../models/RawMaterialStock.js';
import Supplier from '../models/Supplier.js';
import SupplierPayable from '../models/SupplierPayable.js';
import { roundCurrency } from '../utils/purchaseMath.js';
import { createHttpError } from '../utils/httpError.js';

export function normalizeName(name = '') {
  return name.trim().toLowerCase();
}

export async function resolveSupplierByName(name) {
  const normalizedName = normalizeName(name);
  let supplier = await Supplier.findOne({ normalizedName });

  if (!supplier) {
    supplier = await Supplier.create({
      name,
      normalizedName,
    });
  }

  return supplier;
}

export async function resolveProductByName(name) {
  const normalizedName = normalizeName(name);
  let product = await Product.findOne({ normalizedName });

  if (!product) {
    product = await Product.create({
      name,
      normalizedName,
    });
  }

  return product;
}

export async function adjustProductStock(productId, delta) {
  if (!delta) {
    return null;
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw createHttpError(404, 'Product not found.');
  }

  const nextStock = roundCurrency(product.currentStock + delta);

  if (nextStock < 0) {
    throw createHttpError(
      400,
      `Unable to reduce stock for "${product.name}" because it would become negative.`,
    );
  }

  product.currentStock = nextStock;
  await product.save();

  return product;
}

export async function adjustRawMaterialStock({ itemName, unit, delta }) {
  if (!itemName || !unit || !delta) {
    return null;
  }

  const normalizedItemName = normalizeName(itemName);
  let stock = await RawMaterialStock.findOne({
    normalizedItemName,
    unit,
  });

  if (!stock) {
    if (delta < 0) {
      throw createHttpError(
        400,
        `Unable to reduce raw material stock for "${itemName}" (${unit}) because it does not exist.`,
      );
    }

    stock = await RawMaterialStock.create({
      itemName,
      normalizedItemName,
      unit,
      quantity: roundCurrency(delta),
    });

    return stock;
  }

  const nextQuantity = roundCurrency(stock.quantity + delta);

  if (nextQuantity < 0) {
    throw createHttpError(
      400,
      `Unable to reduce raw material stock for "${stock.itemName}" (${stock.unit}) because it would become negative.`,
    );
  }

  stock.itemName = itemName;
  stock.quantity = nextQuantity;
  await stock.save();

  return stock;
}

export async function getRawMaterialStock(itemName, unit) {
  if (!itemName || !unit) {
    return null;
  }

  return RawMaterialStock.findOne({
    normalizedItemName: normalizeName(itemName),
    unit,
  }).lean();
}

export async function syncSupplierOutstanding(supplierId) {
  const normalizedSupplierId =
    typeof supplierId === 'string' ? new mongoose.Types.ObjectId(supplierId) : supplierId;

  const [aggregate] = await SupplierPayable.aggregate([
    {
      $match: {
        supplier: normalizedSupplierId,
      },
    },
    {
      $group: {
        _id: '$supplier',
        total: { $sum: '$amount' },
      },
    },
  ]);

  await Supplier.findByIdAndUpdate(normalizedSupplierId, {
    outstandingPayable: roundCurrency(aggregate?.total || 0),
  });
}

function shouldTrackPayable(paymentType) {
  return paymentType === 'Credit' || paymentType === 'Advance';
}

export async function syncPayableForPurchase({
  purchaseId,
  supplierId,
  paymentType,
  dueDate,
  dueAmount,
}) {
  if (!shouldTrackPayable(paymentType)) {
    await SupplierPayable.findOneAndDelete({ purchase: purchaseId });
    await syncSupplierOutstanding(supplierId);
    return;
  }

  await SupplierPayable.findOneAndUpdate(
    { purchase: purchaseId },
    {
      supplier: supplierId,
      purchase: purchaseId,
      amount: roundCurrency(dueAmount),
      dueDate,
      status: dueAmount > 0 ? 'pending' : 'settled',
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  await syncSupplierOutstanding(supplierId);
}
