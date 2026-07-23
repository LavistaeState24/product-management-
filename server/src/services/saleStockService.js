import Product from '../models/Product.js';
import PUProductStock from '../models/PUProductStock.js';
import RodStock from '../models/RodStock.js';
import SheetStock from '../models/SheetStock.js';
import { createHttpError } from '../utils/httpError.js';
import { roundCurrency } from '../utils/saleMath.js';

const STOCK_CONFIGS = {
  rod: {
    Model: RodStock,
    quantityField: 'quantity',
    itemNumberField: 'itemNumber',
    productNameField: 'item',
    weightField: 'weightKg',
    notFoundMessage: 'Rod stock not found.',
  },
  sheet: {
    Model: SheetStock,
    quantityField: 'quantity',
    itemNumberField: 'itemNumber',
    productNameField: 'itemName',
    weightField: 'weight',
    notFoundMessage: 'Sheet stock not found.',
  },
  'pu-product': {
    Model: PUProductStock,
    quantityField: 'quantity',
    itemNumberField: 'itemNumber',
    productNameField: 'productName',
    sellingUnitField: 'sellingUnit',
    notFoundMessage: 'PU product stock not found.',
  },
  'legacy-product': {
    Model: Product,
    quantityField: 'currentStock',
    productNameField: 'name',
    notFoundMessage: 'Product stock not found.',
    filter: { isActive: true },
  },
};

export const SALE_STOCK_TYPES = Object.freeze(Object.keys(STOCK_CONFIGS));

function normalizeStockType(stockType) {
  if (stockType === 'legacy' || stockType === 'product') {
    return 'legacy-product';
  }

  return stockType || 'legacy-product';
}

function getStockConfig(stockType) {
  const normalizedStockType = normalizeStockType(stockType);
  const config = STOCK_CONFIGS[normalizedStockType];

  if (!config) {
    throw createHttpError(422, 'Stock type must be rod, sheet, pu-product, or legacy-product.');
  }

  return {
    stockType: normalizedStockType,
    config,
  };
}

function getStockLabel(stock, config) {
  return stock[config.productNameField] || stock.name || 'selected stock';
}

function createStockSnapshot({ stock, stockType, config, item }) {
  return {
    stockType,
    stockRef: stock._id,
    itemNumber: stock[config.itemNumberField] || item.itemNumber || '',
    productName: stock[config.productNameField] || item.productName || '',
    size: stock.size || item.size || '',
    colour: stock.colour || item.colour || '',
    weight: config.weightField ? stock[config.weightField] : item.weight ?? null,
    sellingUnit: stock[config.sellingUnitField] || item.sellingUnit || '',
  };
}

async function findLegacyProductByName(productName, session) {
  const normalizedName = productName?.trim().toLowerCase();

  if (!normalizedName) {
    throw createHttpError(422, 'Product name is required for legacy product sales.');
  }

  return Product.findOne({ normalizedName, isActive: true }).session(session);
}

export async function findSaleStock({ item, session }) {
  const { stockType, config } = getStockConfig(item.stockType);
  let stock;

  if (item.stockRef) {
    stock = await config.Model.findOne({
      _id: item.stockRef,
      ...(config.filter || {}),
    }).session(session);
  } else if (stockType === 'legacy-product') {
    stock = await findLegacyProductByName(item.productName, session);
  }

  if (!stock) {
    throw createHttpError(404, config.notFoundMessage);
  }

  return {
    stock,
    stockType,
    config,
    quantityField: config.quantityField,
  };
}

export async function normalizeSaleItem({ item, session }) {
  const resolved = await findSaleStock({ item, session });

  return {
    ...createStockSnapshot({
      stock: resolved.stock,
      stockType: resolved.stockType,
      config: resolved.config,
      item,
    }),
    quantity: Number(item.quantity),
    sellingPrice: Number(item.sellingPrice),
    gstRate: item.gstRate === undefined || item.gstRate === '' ? 0 : Number(item.gstRate),
  };
}

export async function normalizeSaleItems({ payload, session }) {
  const rawItems = Array.isArray(payload.items) && payload.items.length
    ? payload.items
    : [
        {
          stockType: payload.stockType || 'legacy-product',
          stockRef: payload.stockRef || payload.product,
          productName: payload.productName,
          quantity: payload.quantity,
          sellingPrice: payload.sellingPrice,
          gstRate: payload.gstRate || 0,
        },
      ];

  const seenItems = new Set();
  const normalizedItems = [];

  for (const item of rawItems) {
    const duplicateKey = `${normalizeStockType(item.stockType)}:${String(item.stockRef || item.product || item.productName || '').trim()}`;

    if (seenItems.has(duplicateKey)) {
      throw createHttpError(422, 'Duplicate sale items are not allowed for the same stock type and stock reference.');
    }

    seenItems.add(duplicateKey);
    normalizedItems.push(await normalizeSaleItem({ item, session }));
  }

  return normalizedItems;
}

async function changeStockQuantity({ item, delta, session }) {
  const { stock, config, quantityField } = await findSaleStock({ item, session });
  const normalizedDelta = roundCurrency(delta);
  const update = {
    $inc: {
      [quantityField]: normalizedDelta,
    },
  };
  const filter = {
    _id: stock._id,
    ...(config.filter || {}),
  };

  if (normalizedDelta < 0) {
    filter[quantityField] = {
      $gte: Math.abs(normalizedDelta),
    };
  }

  const updatedStock = await config.Model.findOneAndUpdate(
    filter,
    update,
    {
      new: true,
      runValidators: true,
      session,
    },
  );

  if (!updatedStock) {
    throw createHttpError(
      400,
      `Insufficient stock for "${getStockLabel(stock, config)}". Available: ${stock[quantityField]}, required: ${Math.abs(delta)}.`,
    );
  }

  return updatedStock;
}

export async function deductSaleItemsStock({ items, session }) {
  for (const item of items) {
    await changeStockQuantity({
      item,
      delta: -Number(item.quantity),
      session,
    });
  }
}

export async function restoreSaleItemsStock({ items = [], session }) {
  for (const item of items) {
    await changeStockQuantity({
      item,
      delta: Number(item.quantity),
      session,
    });
  }
}

export function saleHasRestorableStock(sale) {
  return sale.invoiceStatus !== 'Cancelled' || !sale.cancellationDetails?.stockRestored;
}
