import fs from 'fs/promises';
import path from 'path';
import Purchase from '../models/Purchase.js';
import Supplier from '../models/Supplier.js';
import SupplierPayable from '../models/SupplierPayable.js';
import Product from '../models/Product.js';
import {
  adjustProductStock,
  adjustRawMaterialStock,
  getRawMaterialStock,
  resolveProductByName,
  resolveSupplierByName,
  syncPayableForPurchase,
  syncSupplierOutstanding,
} from '../services/purchaseService.js';
import { formatPurchase } from '../utils/formatPurchase.js';
import { createHttpError } from '../utils/httpError.js';
import { calculatePurchaseAmounts } from '../utils/purchaseMath.js';

function parsePurchasePayload(body) {
  const rawGstRate = body.gstRate ?? body.gst ?? 0;
  const paymentType = body.paymentType;
  const dueDate = body.dueDate ?? body.creditDueDate;
  const itemName = body.itemName?.trim() || body.productName?.trim();
  const remarks = body.remarks?.trim() || body.notes?.trim() || '';
  const pricePerUnitValue = body.pricePerUnit ?? body.purchasePrice;
  const purchaseDateValue = body.purchaseDate || new Date().toISOString();

  return {
    supplierName: body.supplierName?.trim(),
    supplierAddress: body.supplierAddress?.trim() || '',
    supplierLocation: body.supplierLocation?.trim() || '',
    gstNo: body.gstNo?.trim() || '',
    productName: itemName,
    itemName,
    unit: body.unit || null,
    purchaseDate: new Date(purchaseDateValue),
    quantity: Number(body.quantity),
    purchasePrice: Number(pricePerUnitValue),
    pricePerUnit: Number(pricePerUnitValue),
    gstType: body.gstType || 'None',
    gstRate: rawGstRate === '' ? 0 : Number(rawGstRate),
    paymentType,
    dueDate:
      paymentType === 'Credit' || paymentType === 'Advance' ? new Date(dueDate) : null,
    creditDueDate:
      paymentType === 'Credit' || paymentType === 'Advance' ? new Date(dueDate) : null,
    paidAmount: body.paidAmount ? Number(body.paidAmount) : 0,
    notes: remarks,
    remarks,
    removeBill: body.removeBill === 'true' || body.removeBill === true,
  };
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

async function populatePurchase(purchaseId) {
  return Purchase.findById(purchaseId).populate('supplier').populate('product');
}

function buildFormattedRawMaterialStock(stock) {
  if (!stock) {
    return null;
  }

  return {
    id: stock._id,
    itemName: stock.itemName,
    unit: stock.unit,
    quantity: stock.quantity,
  };
}

async function formatPurchaseResponse(purchase) {
  const rawMaterialStock = await getRawMaterialStock(
    purchase.itemName || purchase.product?.name || purchase.productName,
    purchase.unit,
  );

  return formatPurchase({
    ...(purchase.toObject ? purchase.toObject() : purchase),
    rawMaterialStock: buildFormattedRawMaterialStock(rawMaterialStock),
  });
}

async function formatPurchaseListResponse(purchases) {
  return Promise.all(purchases.map((purchase) => formatPurchaseResponse(purchase)));
}

async function rollbackStockAdjustments(rollbackSteps) {
  for (const step of rollbackSteps) {
    try {
      if (step.type === 'product') {
        await adjustProductStock(step.productId, step.delta);
      } else if (step.type === 'raw-material') {
        await adjustRawMaterialStock({
          itemName: step.itemName,
          unit: step.unit,
          delta: step.delta,
        });
      }
    } catch (error) {
      console.error('Failed to rollback purchase stock adjustment:', error);
    }
  }
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
      { supplierAddress: regex },
      { supplierLocation: regex },
      { gstNo: regex },
      { productName: regex },
      { itemName: regex },
      { unit: regex },
      { paymentType: regex },
      { remarks: regex },
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
    items: await formatPurchaseListResponse(items),
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
    purchase: await formatPurchaseResponse(purchase),
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

  const purchase = await Purchase.create({
    supplier: supplier._id,
    supplierName: supplier.name,
    supplierAddress: payload.supplierAddress,
    supplierLocation: payload.supplierLocation,
    gstNo: payload.gstNo,
    product: product._id,
    productName: product.name,
    itemName: payload.itemName,
    unit: payload.unit,
    purchaseDate: payload.purchaseDate,
    pricePerUnit: payload.pricePerUnit,
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
    dueDate: payload.dueDate,
    creditDueDate: payload.creditDueDate,
    bill: buildBillFromUpload(req.file),
    totalAmount: amounts.totalAmount,
    paidAmount: amounts.paidAmount,
    dueAmount: amounts.dueAmount,
    notes: payload.notes,
    remarks: payload.remarks,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  let productStockAdjusted = false;
  let rawMaterialStockAdjusted = false;

  try {
    await adjustProductStock(product._id, payload.quantity);
    productStockAdjusted = true;

    await adjustRawMaterialStock({
      itemName: payload.itemName,
      unit: payload.unit,
      delta: payload.quantity,
    });
    rawMaterialStockAdjusted = true;

    await syncPayableForPurchase({
      purchaseId: purchase._id,
      supplierId: supplier._id,
      paymentType: payload.paymentType,
      dueDate: payload.dueDate,
      dueAmount: amounts.dueAmount,
    });
  } catch (error) {
    if (rawMaterialStockAdjusted) {
      await rollbackStockAdjustments([
        {
          type: 'raw-material',
          itemName: payload.itemName,
          unit: payload.unit,
          delta: -payload.quantity,
        },
      ]);
    }

    if (productStockAdjusted) {
      await rollbackStockAdjustments([
        {
          type: 'product',
          productId: product._id,
          delta: -payload.quantity,
        },
      ]);
    }

    await SupplierPayable.findOneAndDelete({ purchase: purchase._id }).catch((rollbackError) => {
      console.error('Failed to rollback purchase payable:', rollbackError);
    });
    await syncSupplierOutstanding(supplier._id).catch((rollbackError) => {
      console.error('Failed to rollback supplier outstanding balance:', rollbackError);
    });
    await Purchase.findByIdAndDelete(purchase._id).catch((rollbackError) => {
      console.error('Failed to rollback purchase record:', rollbackError);
    });
    await removeStoredBill(purchase.bill).catch((rollbackError) => {
      console.error('Failed to rollback uploaded bill:', rollbackError);
    });
    throw error;
  }

  const populatedPurchase = await populatePurchase(purchase._id);

  return res.status(201).json({
    message: 'Purchase created successfully.',
    purchase: await formatPurchaseResponse(populatedPurchase),
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
  const previousItemName = purchase.itemName || purchase.productName;
  const previousUnit = purchase.unit || null;
  const oldBill = purchase.bill;
  const rollbackSteps = [];

  try {
    if (oldProductId === String(product._id)) {
      const delta = payload.quantity - purchase.quantity;

      if (delta) {
        await adjustProductStock(product._id, delta);
        rollbackSteps.unshift({
          type: 'product',
          productId: product._id,
          delta: -delta,
        });
      }
    } else {
      await adjustProductStock(purchase.product, -purchase.quantity);
      rollbackSteps.unshift({
        type: 'product',
        productId: purchase.product,
        delta: purchase.quantity,
      });

      await adjustProductStock(product._id, payload.quantity);
      rollbackSteps.unshift({
        type: 'product',
        productId: product._id,
        delta: -payload.quantity,
      });
    }

    if (previousItemName && previousUnit && previousItemName === payload.itemName && previousUnit === payload.unit) {
      const delta = payload.quantity - purchase.quantity;

      if (delta) {
        await adjustRawMaterialStock({
          itemName: payload.itemName,
          unit: payload.unit,
          delta,
        });
        rollbackSteps.unshift({
          type: 'raw-material',
          itemName: payload.itemName,
          unit: payload.unit,
          delta: -delta,
        });
      }
    } else {
      if (previousItemName && previousUnit) {
        await adjustRawMaterialStock({
          itemName: previousItemName,
          unit: previousUnit,
          delta: -purchase.quantity,
        });
        rollbackSteps.unshift({
          type: 'raw-material',
          itemName: previousItemName,
          unit: previousUnit,
          delta: purchase.quantity,
        });
      }

      await adjustRawMaterialStock({
        itemName: payload.itemName,
        unit: payload.unit,
        delta: payload.quantity,
      });
      rollbackSteps.unshift({
        type: 'raw-material',
        itemName: payload.itemName,
        unit: payload.unit,
        delta: -payload.quantity,
      });
    }
  } catch (error) {
    await rollbackStockAdjustments(rollbackSteps);

    if (billFromUpload) {
      await removeStoredBill(billFromUpload).catch((rollbackError) => {
        console.error('Failed to rollback newly uploaded bill:', rollbackError);
      });
    }

    throw error;
  }

  purchase.supplier = supplier._id;
  purchase.supplierName = supplier.name;
  purchase.supplierAddress = payload.supplierAddress;
  purchase.supplierLocation = payload.supplierLocation;
  purchase.gstNo = payload.gstNo;
  purchase.product = product._id;
  purchase.productName = product.name;
  purchase.itemName = payload.itemName;
  purchase.unit = payload.unit;
  purchase.purchaseDate = payload.purchaseDate;
  purchase.pricePerUnit = payload.pricePerUnit;
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
  purchase.dueDate = payload.dueDate;
  purchase.creditDueDate = payload.creditDueDate;
  purchase.totalAmount = amounts.totalAmount;
  purchase.paidAmount = amounts.paidAmount;
  purchase.dueAmount = amounts.dueAmount;
  purchase.notes = payload.notes;
  purchase.remarks = payload.remarks;
  purchase.updatedBy = req.user._id;

  if (billFromUpload) {
    purchase.bill = billFromUpload;
  } else if (payload.removeBill) {
    purchase.bill = null;
  }

  try {
    await purchase.save();
  } catch (error) {
    await rollbackStockAdjustments(rollbackSteps);

    if (billFromUpload) {
      await removeStoredBill(billFromUpload).catch((rollbackError) => {
        console.error('Failed to rollback newly uploaded bill:', rollbackError);
      });
    }

    throw error;
  }

  if (billFromUpload || payload.removeBill) {
    await removeStoredBill(oldBill);
  }

  await syncPayableForPurchase({
    purchaseId: purchase._id,
    supplierId: supplier._id,
    paymentType: payload.paymentType,
    dueDate: payload.dueDate,
    dueAmount: amounts.dueAmount,
  });

  if (oldSupplierId !== String(supplier._id)) {
    await syncSupplierOutstanding(oldSupplierId);
  }

  const populatedPurchase = await populatePurchase(purchase._id);

  return res.status(200).json({
    message: 'Purchase updated successfully.',
    purchase: await formatPurchaseResponse(populatedPurchase),
  });
}

export async function deletePurchase(req, res) {
  const purchase = await Purchase.findById(req.params.purchaseId);

  if (!purchase) {
    throw createHttpError(404, 'Purchase not found.');
  }

  const itemName = purchase.itemName || purchase.productName;

  if (itemName && purchase.unit) {
    await adjustRawMaterialStock({
      itemName,
      unit: purchase.unit,
      delta: -purchase.quantity,
    });
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
