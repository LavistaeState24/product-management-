import Purchase from '../models/Purchase.js';
import Supplier from '../models/Supplier.js';
import SupplierPayable from '../models/SupplierPayable.js';
import Product from '../models/Product.js';

import {
  adjustRawMaterialStock,
  adjustPuChemicalStock,
  getRawMaterialStock,
  getPuChemicalStock,
  resolveProductByName,
  resolveSupplierByName,
  syncPayableForPurchase,
  syncSupplierOutstanding,
} from '../services/purchaseService.js';

import {
  uploadPurchaseBill,
  deletePurchaseBill,
  getPurchaseBillSignedUrl,
} from '../services/purchaseBillStorageService.js';

import { formatPurchase } from '../utils/formatPurchase.js';
import { createHttpError } from '../utils/httpError.js';
import { calculatePurchaseAmounts } from '../utils/purchaseMath.js';

/**
 * Escape special characters before creating a MongoDB regex.
 */
function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a value into a valid date or null.
 */
function parseOptionalDate(value) {
  if (!value) return null;

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime())
    ? null
    : parsedDate;
}

/**
 * Convert multipart/form-data values into clean purchase values.
 */
function parsePurchasePayload(body) {
  const rawGstRate = body.gstRate ?? body.gst ?? 0;
  const paymentType = body.paymentType;
  const dueDateValue =
    body.dueDate ?? body.creditDueDate;

  const itemName =
    body.itemName?.trim() ||
    body.productName?.trim();

  const remarks =
    body.remarks?.trim() ||
    body.notes?.trim() ||
    '';

  const pricePerUnitValue =
    body.pricePerUnit ??
    body.purchasePrice;

  const purchaseDateValue =
    body.purchaseDate ||
    new Date().toISOString();

  const requiresDueDate =
    paymentType === 'Credit' ||
    paymentType === 'Advance';

  const parsedDueDate = requiresDueDate
    ? parseOptionalDate(dueDateValue)
    : null;

  return {
    purchaseType:
      body.purchaseType ||
      'Raw Material',

    supplierName:
      body.supplierName?.trim(),

    supplierAddress:
      body.supplierAddress?.trim() ||
      '',

    supplierLocation:
      body.supplierLocation?.trim() ||
      '',

    gstNo:
      body.gstNo?.trim() ||
      '',

    productName: itemName,
    itemName,

    unit:
      body.unit ||
      null,

    purchaseDate:
      parseOptionalDate(purchaseDateValue) ||
      new Date(),

    quantity:
      Number(body.quantity),

    purchasePrice:
      Number(pricePerUnitValue),

    pricePerUnit:
      Number(pricePerUnitValue),

    gstType:
      body.gstType ||
      'None',

    gstRate:
      rawGstRate === ''
        ? 0
        : Number(rawGstRate),

    paymentType,

    dueDate: parsedDueDate,
    creditDueDate: parsedDueDate,

    paidAmount:
      body.paidAmount === '' ||
      body.paidAmount == null
        ? 0
        : Number(body.paidAmount),

    notes: remarks,
    remarks,

    removeBill:
      body.removeBill === 'true' ||
      body.removeBill === true,
  };
}

/**
 * Delete a purchase bill from S3.
 */
async function removeStoredBill(bill) {
  if (!bill?.storagePath) return;

  await deletePurchaseBill(
    bill.storagePath,
  );
}

async function restorePurchaseSnapshot(
  purchaseId,
  snapshot,
) {
  if (!snapshot) return;

  await Purchase.findByIdAndUpdate(
    purchaseId,
    snapshot,
    {
      runValidators: false,
    },
  );
}

async function restorePayableSnapshot(
  purchaseId,
  snapshot,
) {
  if (!snapshot) {
    await SupplierPayable.findOneAndDelete({
      purchase: purchaseId,
    });
    return;
  }

  await SupplierPayable.findOneAndReplace(
    {
      _id: snapshot._id,
    },
    snapshot,
    {
      upsert: true,
      runValidators: false,
    },
  );
}

async function populatePurchase(purchaseId) {
  return Purchase.findById(purchaseId)
    .populate('supplier')
    .populate('product');
}

function buildFormattedStock(stock) {
  if (!stock) return null;

  return {
    id: stock._id,
    itemName: stock.itemName,
    unit: stock.unit,
    quantity: stock.quantity,
  };
}

async function getPurchaseRelatedStock(purchase) {
  const itemName =
    purchase.itemName ||
    purchase.product?.name ||
    purchase.productName;

  const purchaseType =
    purchase.purchaseType ||
    'Raw Material';

  if (!itemName || !purchase.unit) {
    return null;
  }

  if (
    purchaseType === 'PU Chemical' ||
    purchaseType === 'Mocha Chemical'
  ) {
    return getPuChemicalStock(
      itemName,
      purchase.unit,
    );
  }

  return getRawMaterialStock(
    itemName,
    purchase.unit,
  );
}

async function adjustPurchaseStock({
  purchaseType,
  itemName,
  unit,
  delta,
}) {
  if (
    purchaseType === 'PU Chemical' ||
    purchaseType === 'Mocha Chemical'
  ) {
    return adjustPuChemicalStock({
      itemName,
      unit,
      delta,
      category: purchaseType,
    });
  }

  return adjustRawMaterialStock({
    itemName,
    unit,
    delta,
  });
}

async function formatPurchaseResponse(purchase) {
  const stock =
    await getPurchaseRelatedStock(purchase);

  return formatPurchase({
    ...(purchase.toObject
      ? purchase.toObject()
      : purchase),

    rawMaterialStock:
      buildFormattedStock(stock),

    purchaseStock:
      buildFormattedStock(stock),
  });
}

async function formatPurchaseListResponse(
  purchases,
) {
  return Promise.all(
    purchases.map((purchase) =>
      formatPurchaseResponse(purchase),
    ),
  );
}

async function rollbackStockAdjustments(
  rollbackSteps,
) {
  for (const step of rollbackSteps) {
    try {
      if (step.type === 'purchase-stock') {
        await adjustPurchaseStock({
          purchaseType:
            step.purchaseType,

          itemName:
            step.itemName,

          unit:
            step.unit,

          delta:
            step.delta,
        });
      }
    } catch (error) {
      console.error(
        'Failed to rollback purchase stock adjustment:',
        error,
      );
    }
  }
}

/**
 * Get supplier and product options for purchase form.
 */
export async function getPurchaseFormOptions(
  req,
  res,
) {
  const [suppliers, products] =
    await Promise.all([
      Supplier.find({
        isActive: true,
      })
        .sort({
          name: 1,
        })
        .limit(200)
        .lean(),

      Product.find({
        isActive: true,
      })
        .sort({
          name: 1,
        })
        .limit(200)
        .lean(),
    ]);

  return res.status(200).json({
    suppliers: suppliers.map(
      (supplier) => ({
        id: supplier._id,
        name: supplier.name,
        outstandingPayable:
          supplier.outstandingPayable,
      }),
    ),

    products: products.map(
      (product) => ({
        id: product._id,
        name: product.name,
        currentStock:
          product.currentStock,
      }),
    ),
  });
}

/**
 * List purchases.
 */
export async function listPurchases(req, res) {
  const page = Math.max(
    1,
    Number(req.query.page) || 1,
  );

  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(req.query.limit) || 10,
    ),
  );

  const search =
    req.query.search?.trim();

  const paymentType =
    req.query.paymentType?.trim();

  const purchaseType =
    req.query.purchaseType?.trim();

  const filter = {};

  if (search) {
    const regex = new RegExp(
      escapeRegex(search),
      'i',
    );

    filter.$or = [
      {
        supplierName: regex,
      },
      {
        supplierAddress: regex,
      },
      {
        supplierLocation: regex,
      },
      {
        gstNo: regex,
      },
      {
        productName: regex,
      },
      {
        itemName: regex,
      },
      {
        unit: regex,
      },
      {
        paymentType: regex,
      },
      {
        purchaseType: regex,
      },
      {
        remarks: regex,
      },
      {
        notes: regex,
      },
    ];
  }

  if (paymentType) {
    filter.paymentType = paymentType;
  }

  if (purchaseType) {
    filter.purchaseType =
      purchaseType;
  }

  const skip =
    (page - 1) * limit;

  const [items, totalItems] =
    await Promise.all([
      Purchase.find(filter)
        .populate('supplier')
        .populate('product')
        .sort({
          purchaseDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      Purchase.countDocuments(filter),
    ]);

  return res.status(200).json({
    items:
      await formatPurchaseListResponse(
        items,
      ),

    pagination: {
      page,
      limit,
      totalItems,

      totalPages: Math.max(
        1,
        Math.ceil(
          totalItems / limit,
        ),
      ),
    },
  });
}

/**
 * Get a single purchase.
 */
export async function getPurchaseById(
  req,
  res,
) {
  const purchase =
    await populatePurchase(
      req.params.purchaseId,
    );

  if (!purchase) {
    throw createHttpError(
      404,
      'Purchase not found.',
    );
  }

  return res.status(200).json({
    purchase:
      await formatPurchaseResponse(
        purchase,
      ),
  });
}

/**
 * Generate a temporary signed URL
 * for a private S3 purchase bill.
 */
export async function getPurchaseBill(
  req,
  res,
) {
  const purchase =
    await Purchase.findById(
      req.params.purchaseId,
    )
      .select('bill')
      .lean();

  if (!purchase) {
    throw createHttpError(
      404,
      'Purchase not found.',
    );
  }

  if (!purchase.bill?.storagePath) {
    throw createHttpError(
      404,
      'No bill was uploaded for this purchase.',
    );
  }

  const url =
    await getPurchaseBillSignedUrl(
      purchase.bill.storagePath,
      {
        originalName:
          purchase.bill.originalName,
      },
    );

  return res.status(200).json({
    url,

    bill: {
      originalName:
        purchase.bill.originalName ||
        'Purchase bill',

      filename:
        purchase.bill.filename ||
        '',

      mimeType:
        purchase.bill.mimeType ||
        '',

      size:
        purchase.bill.size ??
        0,

      uploadedAt:
        purchase.bill.uploadedAt ||
        null,
    },
  });
}

/**
 * Create purchase and upload bill to S3.
 */
export async function createPurchase(
  req,
  res,
) {
  const payload =
    parsePurchasePayload(req.body);

  const amounts =
    calculatePurchaseAmounts(payload);

  if (amounts.dueAmount < 0) {
    throw createHttpError(
      422,
      'Due amount cannot be negative.',
    );
  }

  const [supplier, product] =
    await Promise.all([
      resolveSupplierByName(
        payload.supplierName,
      ),

      resolveProductByName(
        payload.productName,
      ),
    ]);

  let uploadedBill = null;
  let purchase = null;

  if (req.file) {
    uploadedBill =
      await uploadPurchaseBill(
        req.file,
      );
  }

  try {
    purchase = await Purchase.create({
      supplier: supplier._id,
      supplierName: supplier.name,

      supplierAddress:
        payload.supplierAddress,

      supplierLocation:
        payload.supplierLocation,

      gstNo:
        payload.gstNo,

      product: product._id,
      productName: product.name,

      purchaseType:
        payload.purchaseType,

      itemName:
        payload.itemName,

      unit:
        payload.unit,

      purchaseDate:
        payload.purchaseDate,

      pricePerUnit:
        payload.pricePerUnit,

      quantity:
        payload.quantity,

      purchasePrice:
        payload.purchasePrice,

      basicAmount:
        amounts.basicAmount,

      gstType:
        payload.gstType,

      gstRate:
        payload.gstRate,

      gstAmount:
        amounts.gstAmount,

      cgstAmount:
        amounts.cgstAmount,

      sgstAmount:
        amounts.sgstAmount,

      igstAmount:
        amounts.igstAmount,

      paymentType:
        payload.paymentType,

      dueDate:
        payload.dueDate,

      creditDueDate:
        payload.creditDueDate,

      bill:
        uploadedBill,

      totalAmount:
        amounts.totalAmount,

      paidAmount:
        amounts.paidAmount,

      dueAmount:
        amounts.dueAmount,

      notes:
        payload.notes,

      remarks:
        payload.remarks,

      createdBy:
        req.user._id,

      updatedBy:
        req.user._id,
    });
  } catch (error) {
    if (uploadedBill) {
      await removeStoredBill(
        uploadedBill,
      ).catch(console.error);
    }

    throw error;
  }

  const rollbackSteps = [];

  try {
    await adjustPurchaseStock({
      purchaseType:
        payload.purchaseType,

      itemName:
        payload.itemName,

      unit:
        payload.unit,

      delta:
        payload.quantity,
    });

    rollbackSteps.unshift({
      type: 'purchase-stock',

      purchaseType:
        payload.purchaseType,

      itemName:
        payload.itemName,

      unit:
        payload.unit,

      delta:
        -payload.quantity,
    });

    await syncPayableForPurchase({
      purchaseId:
        purchase._id,

      supplierId:
        supplier._id,

      paymentType:
        payload.paymentType,

      dueDate:
        payload.dueDate,

      dueAmount:
        amounts.dueAmount,
    });
  } catch (error) {
    await rollbackStockAdjustments(
      rollbackSteps,
    );

    await SupplierPayable.findOneAndDelete({
      purchase: purchase._id,
    }).catch(console.error);

    await syncSupplierOutstanding(
      supplier._id,
    ).catch(console.error);

    await Purchase.findByIdAndDelete(
      purchase._id,
    ).catch(console.error);

    await removeStoredBill(
      purchase.bill,
    ).catch(console.error);

    throw error;
  }

  const populatedPurchase =
    await populatePurchase(
      purchase._id,
    );

  return res.status(201).json({
    message:
      'Purchase created successfully.',

    purchase:
      await formatPurchaseResponse(
        populatedPurchase,
      ),
  });
}

/**
 * Update purchase and optionally
 * replace or remove bill.
 */
export async function updatePurchase(
  req,
  res,
) {
  const purchase =
    await Purchase.findById(
      req.params.purchaseId,
    );

  if (!purchase) {
    throw createHttpError(
      404,
      'Purchase not found.',
    );
  }

  const payload =
    parsePurchasePayload(req.body);

  const amounts =
    calculatePurchaseAmounts(payload);

  if (amounts.dueAmount < 0) {
    throw createHttpError(
      422,
      'Due amount cannot be negative.',
    );
  }

  const [supplier, product] =
    await Promise.all([
      resolveSupplierByName(
        payload.supplierName,
      ),

      resolveProductByName(
        payload.productName,
      ),
    ]);

  let billFromUpload = null;

  if (req.file) {
    billFromUpload =
      await uploadPurchaseBill(
        req.file,
      );
  }

  const oldSupplierId =
    String(purchase.supplier);

  const previousPurchaseType =
    purchase.purchaseType ||
    'Raw Material';

  const previousItemName =
    purchase.itemName ||
    purchase.productName;

  const previousUnit =
    purchase.unit ||
    null;

  const oldBill =
    purchase.bill?.storagePath
      ? {
          originalName:
            purchase.bill.originalName,

          filename:
            purchase.bill.filename,

          mimeType:
            purchase.bill.mimeType,

          size:
            purchase.bill.size,

          storagePath:
            purchase.bill.storagePath,

          url:
            purchase.bill.url,

          uploadedAt:
            purchase.bill.uploadedAt,
        }
      : null;

  const purchaseSnapshot =
    purchase.toObject();

  const payableSnapshot =
    await SupplierPayable.findOne({
      purchase: purchase._id,
    }).lean();

  const rollbackSteps = [];

  try {
    const sameStockItem =
      previousPurchaseType ===
        payload.purchaseType &&
      previousItemName &&
      previousUnit &&
      previousItemName ===
        payload.itemName &&
      previousUnit ===
        payload.unit;

    if (sameStockItem) {
      const delta =
        payload.quantity -
        purchase.quantity;

      if (delta) {
        await adjustPurchaseStock({
          purchaseType:
            payload.purchaseType,

          itemName:
            payload.itemName,

          unit:
            payload.unit,

          delta,
        });

        rollbackSteps.unshift({
          type: 'purchase-stock',

          purchaseType:
            payload.purchaseType,

          itemName:
            payload.itemName,

          unit:
            payload.unit,

          delta:
            -delta,
        });
      }
    } else {
      if (
        previousItemName &&
        previousUnit
      ) {
        await adjustPurchaseStock({
          purchaseType:
            previousPurchaseType,

          itemName:
            previousItemName,

          unit:
            previousUnit,

          delta:
            -purchase.quantity,
        });

        rollbackSteps.unshift({
          type: 'purchase-stock',

          purchaseType:
            previousPurchaseType,

          itemName:
            previousItemName,

          unit:
            previousUnit,

          delta:
            purchase.quantity,
        });
      }

      await adjustPurchaseStock({
        purchaseType:
          payload.purchaseType,

        itemName:
          payload.itemName,

        unit:
          payload.unit,

        delta:
          payload.quantity,
      });

      rollbackSteps.unshift({
        type: 'purchase-stock',

        purchaseType:
          payload.purchaseType,

        itemName:
          payload.itemName,

        unit:
          payload.unit,

        delta:
          -payload.quantity,
      });
    }
  } catch (error) {
    await rollbackStockAdjustments(
      rollbackSteps,
    );

    if (billFromUpload) {
      await removeStoredBill(
        billFromUpload,
      ).catch(console.error);
    }

    throw error;
  }

  purchase.supplier =
    supplier._id;

  purchase.supplierName =
    supplier.name;

  purchase.supplierAddress =
    payload.supplierAddress;

  purchase.supplierLocation =
    payload.supplierLocation;

  purchase.gstNo =
    payload.gstNo;

  purchase.product =
    product._id;

  purchase.productName =
    product.name;

  purchase.purchaseType =
    payload.purchaseType;

  purchase.itemName =
    payload.itemName;

  purchase.unit =
    payload.unit;

  purchase.purchaseDate =
    payload.purchaseDate;

  purchase.pricePerUnit =
    payload.pricePerUnit;

  purchase.quantity =
    payload.quantity;

  purchase.purchasePrice =
    payload.purchasePrice;

  purchase.basicAmount =
    amounts.basicAmount;

  purchase.gstType =
    payload.gstType;

  purchase.gstRate =
    payload.gstRate;

  purchase.gstAmount =
    amounts.gstAmount;

  purchase.cgstAmount =
    amounts.cgstAmount;

  purchase.sgstAmount =
    amounts.sgstAmount;

  purchase.igstAmount =
    amounts.igstAmount;

  purchase.paymentType =
    payload.paymentType;

  purchase.dueDate =
    payload.dueDate;

  purchase.creditDueDate =
    payload.creditDueDate;

  purchase.totalAmount =
    amounts.totalAmount;

  purchase.paidAmount =
    amounts.paidAmount;

  purchase.dueAmount =
    amounts.dueAmount;

  purchase.notes =
    payload.notes;

  purchase.remarks =
    payload.remarks;

  purchase.updatedBy =
    req.user._id;

  if (billFromUpload) {
    purchase.bill =
      billFromUpload;
  } else if (payload.removeBill) {
    purchase.bill = {
      originalName: null,
      filename: null,
      mimeType: null,
      size: null,
      storagePath: null,
      url: null,
      uploadedAt: null,
    };
  }

  try {
    await purchase.save();
  } catch (error) {
    await rollbackStockAdjustments(
      rollbackSteps,
    );

    if (billFromUpload) {
      await removeStoredBill(
        billFromUpload,
      ).catch(console.error);
    }

    throw error;
  }

  try {
    await syncPayableForPurchase({
      purchaseId:
        purchase._id,

      supplierId:
        supplier._id,

      paymentType:
        payload.paymentType,

      dueDate:
        payload.dueDate,

      dueAmount:
        amounts.dueAmount,
    });

    if (
      oldSupplierId !==
      String(supplier._id)
    ) {
      await syncSupplierOutstanding(
        oldSupplierId,
      );
    }
  } catch (error) {
    console.error(
      'Failed to synchronize purchase payable:',
      error,
    );

    await rollbackStockAdjustments(
      rollbackSteps,
    );

    await restorePurchaseSnapshot(
      purchase._id,
      purchaseSnapshot,
    ).catch((restoreError) => {
      console.error(
        'Failed to restore purchase after payable synchronization error:',
        restoreError,
      );
    });

    await restorePayableSnapshot(
      purchase._id,
      payableSnapshot,
    ).catch((restoreError) => {
      console.error(
        'Failed to restore supplier payable after synchronization error:',
        restoreError,
      );
    });

    await syncSupplierOutstanding(
      supplier._id,
    ).catch(console.error);

    if (
      oldSupplierId !==
      String(supplier._id)
    ) {
      await syncSupplierOutstanding(
        oldSupplierId,
      ).catch(console.error);
    }

    if (billFromUpload) {
      await removeStoredBill(
        billFromUpload,
      ).catch(console.error);
    }

    throw error;
  }

  /*
   * Delete old bill only after
   * purchase and payable updates succeed.
   */
  if (
    oldBill &&
    (billFromUpload ||
      payload.removeBill)
  ) {
    await removeStoredBill(
      oldBill,
    ).catch((error) => {
      console.error(
        'Failed to remove old purchase bill:',
        error,
      );
    });
  }

  const populatedPurchase =
    await populatePurchase(
      purchase._id,
    );

  return res.status(200).json({
    message:
      'Purchase updated successfully.',

    purchase:
      await formatPurchaseResponse(
        populatedPurchase,
      ),
  });
}

/**
 * Delete purchase, stock,
 * payable and bill.
 */
export async function deletePurchase(
  req,
  res,
) {
  const purchase =
    await Purchase.findById(
      req.params.purchaseId,
    );

  if (!purchase) {
    throw createHttpError(
      404,
      'Purchase not found.',
    );
  }

  const itemName =
    purchase.itemName ||
    purchase.productName;

  const purchaseType =
    purchase.purchaseType ||
    'Raw Material';

  if (
    itemName &&
    purchase.unit
  ) {
    await adjustPurchaseStock({
      purchaseType,
      itemName,
      unit: purchase.unit,
      delta: -purchase.quantity,
    });
  }

  await SupplierPayable.findOneAndDelete({
    purchase: purchase._id,
  });

  await syncSupplierOutstanding(
    purchase.supplier,
  );

  /*
   * S3 cleanup failure should not block
   * deleting the business record.
   */
  await removeStoredBill(
    purchase.bill,
  ).catch((error) => {
    console.error(
      'Failed to delete purchase bill from S3:',
      error,
    );
  });

  await Purchase.findByIdAndDelete(
    purchase._id,
  );

  return res.status(200).json({
    message:
      'Purchase deleted successfully.',
  });
}
