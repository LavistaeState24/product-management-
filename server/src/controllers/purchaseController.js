import fs from 'fs/promises';
import mongoose from 'mongoose';
import path from 'path';
import Product from '../models/Product.js';
import Purchase from '../models/Purchase.js';
import Supplier from '../models/Supplier.js';
import SupplierPayable from '../models/SupplierPayable.js';
import { formatPurchase } from '../utils/formatPurchase.js';
import { createHttpError } from '../utils/httpError.js';
import { calculatePurchaseAmounts, roundCurrency } from '../utils/purchaseMath.js';

function normalizeName(name = '') {
  return name.trim().toLowerCase();
}

function parsePurchasePayload(body) {
  const rawGstRate = body.gstRate ?? body.gst ?? 0;

  return {
    supplierName: body.supplierName?.trim(),
    productName: body.productName?.trim(),
    purchaseDate: new Date(body.purchaseDate),
    quantity: Number(body.quantity),
    purchasePrice: Number(body.purchasePrice),
    gstType: body.gstType || 'None',
    gstRate: rawGstRate === '' ? 0 : Number(rawGstRate),
    paymentType: body.paymentType,
    creditDueDate: body.paymentType === 'Credit' ? new Date(body.creditDueDate) : null,
    paidAmount: body.paidAmount ? Number(body.paidAmount) : 0,
    notes: body.notes?.trim() || '',
    removeBill: body.removeBill === 'true' || body.removeBill === true,
  };
}

async function resolveSupplierByName(name) {
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

async function resolveProductByName(name) {
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

async function adjustProductStock(productId, delta) {
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
}

async function syncSupplierOutstanding(supplierId) {
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

function buildBillFromUpload(file) {
  if (!file) {
    return null;
  }

  const storagePath = path.join('uploads', 'bills', file.filename);

  return {
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    storagePath,
    url: `/${storagePath.replace(/\\/g, '/')}`,
  };
}

async function removeStoredBill(bill) {
  if (!bill?.storagePath) {
    return;
  }

  try {
    await fs.unlink(path.resolve(process.cwd(), bill.storagePath));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function syncPayableForPurchase({ purchaseId, supplierId, paymentType, creditDueDate, dueAmount }) {
  if (paymentType !== 'Credit') {
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
      dueDate: creditDueDate,
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

async function populatePurchase(purchaseId) {
  return Purchase.findById(purchaseId).populate('supplier').populate('product');
}

export async function getPurchaseFormOptions(req, res) {
  const [suppliers, products] = await Promise.all([
    Supplier.find({ isActive: true }).sort({ name: 1 }).limit(200).lean(),
    Product.find({ isActive: true }).sort({ name: 1 }).limit(200).lean(),
  ]);

  return res.status(200).json({
    suppliers: suppliers.map((supplier) => ({
      id: supplier._id,
      name: supplier.name,
      outstandingPayable: supplier.outstandingPayable,
    })),
    products: products.map((product) => ({
      id: product._id,
      name: product.name,
      currentStock: product.currentStock,
    })),
  });
}

export async function listPurchases(req, res) {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const search = req.query.search?.trim();
  const paymentType = req.query.paymentType?.trim();
  const filter = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { supplierName: regex },
      { productName: regex },
      { paymentType: regex },
      { notes: regex },
    ];
  }

  if (paymentType) {
    filter.paymentType = paymentType;
  }

  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    Purchase.find(filter)
      .populate('supplier')
      .populate('product')
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Purchase.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatPurchase),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  });
}

export async function getPurchaseById(req, res) {
  const purchase = await populatePurchase(req.params.purchaseId);

  if (!purchase) {
    throw createHttpError(404, 'Purchase not found.');
  }

  return res.status(200).json({
    purchase: formatPurchase(purchase),
  });
}

export async function createPurchase(req, res) {
  const payload = parsePurchasePayload(req.body);
  const amounts = calculatePurchaseAmounts(payload);

  if (amounts.dueAmount < 0) {
    throw createHttpError(422, 'Due amount cannot be negative.');
  }

  const [supplier, product] = await Promise.all([
    resolveSupplierByName(payload.supplierName),
    resolveProductByName(payload.productName),
  ]);

  await adjustProductStock(product._id, payload.quantity);

  const purchase = await Purchase.create({
    supplier: supplier._id,
    supplierName: supplier.name,
    product: product._id,
    productName: product.name,
    purchaseDate: payload.purchaseDate,
    quantity: payload.quantity,
    purchasePrice: payload.purchasePrice,
    basicAmount: amounts.basicAmount,
    gstType: payload.gstType,
    gstRate: payload.gstRate,
    gstAmount: amounts.gstAmount,
    cgstAmount: amounts.cgstAmount,
    sgstAmount: amounts.sgstAmount,
    igstAmount: amounts.igstAmount,
    paymentType: payload.paymentType,
    creditDueDate: payload.creditDueDate,
    bill: buildBillFromUpload(req.file),
    totalAmount: amounts.totalAmount,
    paidAmount: amounts.paidAmount,
    dueAmount: amounts.dueAmount,
    notes: payload.notes,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  await syncPayableForPurchase({
    purchaseId: purchase._id,
    supplierId: supplier._id,
    paymentType: payload.paymentType,
    creditDueDate: payload.creditDueDate,
    dueAmount: amounts.dueAmount,
  });

  const populatedPurchase = await populatePurchase(purchase._id);

  return res.status(201).json({
    message: 'Purchase created successfully.',
    purchase: formatPurchase(populatedPurchase),
  });
}

export async function updatePurchase(req, res) {
  const purchase = await Purchase.findById(req.params.purchaseId);

  if (!purchase) {
    throw createHttpError(404, 'Purchase not found.');
  }

  const payload = parsePurchasePayload(req.body);
  const amounts = calculatePurchaseAmounts(payload);

  if (amounts.dueAmount < 0) {
    throw createHttpError(422, 'Due amount cannot be negative.');
  }

  const [supplier, product] = await Promise.all([
    resolveSupplierByName(payload.supplierName),
    resolveProductByName(payload.productName),
  ]);

  const billFromUpload = buildBillFromUpload(req.file);
  const oldSupplierId = String(purchase.supplier);
  const oldProductId = String(purchase.product);
  const oldBill = purchase.bill;

  if (oldProductId === String(product._id)) {
    await adjustProductStock(product._id, payload.quantity - purchase.quantity);
  } else {
    await adjustProductStock(purchase.product, -purchase.quantity);
    await adjustProductStock(product._id, payload.quantity);
  }

  purchase.supplier = supplier._id;
  purchase.supplierName = supplier.name;
  purchase.product = product._id;
  purchase.productName = product.name;
  purchase.purchaseDate = payload.purchaseDate;
  purchase.quantity = payload.quantity;
  purchase.purchasePrice = payload.purchasePrice;
  purchase.basicAmount = amounts.basicAmount;
  purchase.gstType = payload.gstType;
  purchase.gstRate = payload.gstRate;
  purchase.gstAmount = amounts.gstAmount;
  purchase.cgstAmount = amounts.cgstAmount;
  purchase.sgstAmount = amounts.sgstAmount;
  purchase.igstAmount = amounts.igstAmount;
  purchase.paymentType = payload.paymentType;
  purchase.creditDueDate = payload.creditDueDate;
  purchase.totalAmount = amounts.totalAmount;
  purchase.paidAmount = amounts.paidAmount;
  purchase.dueAmount = amounts.dueAmount;
  purchase.notes = payload.notes;
  purchase.updatedBy = req.user._id;

  if (billFromUpload) {
    purchase.bill = billFromUpload;
  } else if (payload.removeBill) {
    purchase.bill = null;
  }

  await purchase.save();

  if (billFromUpload || payload.removeBill) {
    await removeStoredBill(oldBill);
  }

  await syncPayableForPurchase({
    purchaseId: purchase._id,
    supplierId: supplier._id,
    paymentType: payload.paymentType,
    creditDueDate: payload.creditDueDate,
    dueAmount: amounts.dueAmount,
  });

  if (oldSupplierId !== String(supplier._id)) {
    await syncSupplierOutstanding(oldSupplierId);
  }

  const populatedPurchase = await populatePurchase(purchase._id);

  return res.status(200).json({
    message: 'Purchase updated successfully.',
    purchase: formatPurchase(populatedPurchase),
  });
}

export async function deletePurchase(req, res) {
  const purchase = await Purchase.findById(req.params.purchaseId);

  if (!purchase) {
    throw createHttpError(404, 'Purchase not found.');
  }

  await adjustProductStock(purchase.product, -purchase.quantity);
  await SupplierPayable.findOneAndDelete({ purchase: purchase._id });
  await syncSupplierOutstanding(purchase.supplier);
  await removeStoredBill(purchase.bill);
  await Purchase.findByIdAndDelete(purchase._id);

  return res.status(200).json({
    message: 'Purchase deleted successfully.',
  });
}
