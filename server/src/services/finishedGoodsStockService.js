import Product from '../models/Product.js';
import PUProductStock from '../models/PUProductStock.js';
import RodStock from '../models/RodStock.js';
import SheetStock from '../models/SheetStock.js';
import { buildPagination, buildSearchFilter } from '../utils/queryHelpers.js';

const LOW_STOCK_THRESHOLD = 10;

const STOCK_TYPES = {
  rod: 'Rod Stock',
  sheet: 'Sheet Stock',
  rodProduct: 'Rod-based Product Stock',
  sheetProduct: 'Sheet-based Product Stock',
  puProduct: 'PU Product Stock',
};

const TYPE_ALIASES = {
  rod: 'rod',
  sheet: 'sheet',
  'rod-product': 'rodProduct',
  'sheet-product': 'sheetProduct',
  'pu-product': 'puProduct',
};

const DEFAULT_TYPES = ['rod', 'sheet', 'puProduct'];

const TYPE_CONFIGS = {
  rod: {
    Model: RodStock,
    searchFields: [
      'itemNumber',
      'item',
      'size',
      'colour',
      { field: 'weightKg', type: 'number' },
    ],
    populate: ['productionBatchId'],
    normalize: normalizeRodStock,
  },
  sheet: {
    Model: SheetStock,
    searchFields: [
      'itemNumber',
      'itemName',
      'size',
      'colour',
      { field: 'weight', type: 'number' },
    ],
    populate: ['productionBatchId'],
    normalize: normalizeSheetStock,
  },
  rodProduct: {
    Model: Product,
    searchFields: ['name', { field: 'currentStock', type: 'number' }],
    filter: { isActive: true },
    normalize: (stock) => normalizeProductStock(stock, 'rodProduct'),
  },
  sheetProduct: {
    Model: Product,
    searchFields: ['name', { field: 'currentStock', type: 'number' }],
    filter: { isActive: true },
    normalize: (stock) => normalizeProductStock(stock, 'sheetProduct'),
  },
  puProduct: {
    Model: PUProductStock,
    searchFields: ['itemNumber', 'productName', 'size', 'colour', 'sellingUnit'],
    populate: ['manufacturingBatchId'],
    normalize: normalizePUProductStock,
  },
};

function resolveBatchReference(value) {
  if (!value) return null;

  return {
    id: value._id || value,
    batchId: value.batchId,
    batchNumber: value.batchNumber,
  };
}

function normalizeRodStock(stock) {
  return {
    id: `rod:${stock._id}`,
    stockId: stock._id,
    type: 'rod',
    itemNumber: stock.itemNumber,
    productName: stock.item,
    size: stock.size,
    colour: stock.colour,
    weight: stock.weightKg,
    quantity: stock.quantity,
    sellingUnit: null,
    productionBatch: resolveBatchReference(stock.productionBatchId),
    productionDate: stock.productionDate,
    stockType: STOCK_TYPES.rod,
    updatedAt: stock.updatedAt,
  };
}

function normalizeSheetStock(stock) {
  return {
    id: `sheet:${stock._id}`,
    stockId: stock._id,
    type: 'sheet',
    itemNumber: stock.itemNumber,
    productName: stock.itemName,
    size: stock.size,
    colour: stock.colour,
    weight: stock.weight,
    quantity: stock.quantity,
    sellingUnit: null,
    productionBatch: resolveBatchReference(stock.productionBatchId),
    productionDate: stock.productionDate,
    stockType: STOCK_TYPES.sheet,
    updatedAt: stock.updatedAt,
  };
}

function normalizeProductStock(stock, type) {
  return {
    id: `${type}:${stock._id}`,
    stockId: stock._id,
    type: type === 'rodProduct' ? 'rod-product' : 'sheet-product',
    itemNumber: '',
    productName: stock.name,
    size: '',
    colour: '',
    weight: null,
    quantity: stock.currentStock,
    sellingUnit: null,
    productionBatch: null,
    productionDate: stock.updatedAt,
    stockType: STOCK_TYPES[type],
    updatedAt: stock.updatedAt,
  };
}

function normalizePUProductStock(stock) {
  return {
    id: `pu-product:${stock._id}`,
    stockId: stock._id,
    type: 'pu-product',
    itemNumber: stock.itemNumber,
    productName: stock.productName,
    size: stock.size,
    colour: stock.colour,
    weight: null,
    quantity: stock.quantity,
    sellingUnit: stock.sellingUnit,
    productionBatch: resolveBatchReference(stock.manufacturingBatchId),
    productionDate: stock.productionDate,
    stockType: STOCK_TYPES.puProduct,
    updatedAt: stock.updatedAt,
  };
}

function normalizeType(type) {
  return TYPE_ALIASES[type] || null;
}

function getRequestedTypes(type) {
  if (!type) {
    return DEFAULT_TYPES;
  }

  const normalizedType = normalizeType(type);
  return normalizedType ? [normalizedType] : [];
}

function buildTypeFilter({ config, search }) {
  return {
    ...(config.filter || {}),
    ...buildSearchFilter(search, config.searchFields),
  };
}

async function fetchTypeData({ type, search }) {
  const config = TYPE_CONFIGS[type];
  let query = config.Model.find(buildTypeFilter({ config, search }));

  (config.populate || []).forEach((populateConfig) => {
    query = query.populate(populateConfig);
  });

  const records = await query.lean();
  return records.map(config.normalize);
}

function hasInvalidQuantity(item) {
  return Number(item.quantity) < 0;
}

function dedupeByTypeAndStockId(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.type}:${item.stockId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getComparableValue(item, sortBy) {
  if (sortBy === 'itemNumber') return item.itemNumber || '';
  if (sortBy === 'productName') return item.productName || '';
  if (sortBy === 'size') return item.size || '';
  if (sortBy === 'colour') return item.colour || '';
  if (sortBy === 'weight') return Number(item.weight || 0);
  if (sortBy === 'quantity') return Number(item.quantity || 0);
  if (sortBy === 'stockType') return item.stockType || '';

  return new Date(item.productionDate || item.updatedAt || 0).getTime();
}

function sortStockItems(items, { sortBy = 'productionDate', sortOrder = 'desc' }) {
  const direction = sortOrder === 'asc' ? 1 : -1;

  return [...items].sort((left, right) => {
    const leftValue = getComparableValue(left, sortBy);
    const rightValue = getComparableValue(right, sortBy);

    if (leftValue < rightValue) return -1 * direction;
    if (leftValue > rightValue) return 1 * direction;

    return String(left.productName || '').localeCompare(String(right.productName || ''));
  });
}

function buildTypeSummary(items) {
  return items.reduce((summary, item) => {
    if (!summary[item.type]) {
      summary[item.type] = {
        stockType: item.stockType,
        totalItems: 0,
        totalQuantity: 0,
        lowStock: 0,
        outOfStock: 0,
      };
    }

    summary[item.type].totalItems += 1;
    summary[item.type].totalQuantity += Number(item.quantity || 0);

    if (Number(item.quantity || 0) === 0) {
      summary[item.type].outOfStock += 1;
    } else if (Number(item.quantity || 0) <= LOW_STOCK_THRESHOLD) {
      summary[item.type].lowStock += 1;
    }

    return summary;
  }, {});
}

function buildSummary(items) {
  const outOfStock = items.filter((item) => Number(item.quantity || 0) === 0).length;
  const lowStock = items.filter(
    (item) => Number(item.quantity || 0) > 0 && Number(item.quantity || 0) <= LOW_STOCK_THRESHOLD,
  ).length;

  return {
    totalItems: items.length,
    totalQuantity: items.reduce((total, item) => total + Number(item.quantity || 0), 0),
    lowStock,
    outOfStock,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    byType: buildTypeSummary(items),
  };
}

export async function listFinishedGoodsStock({
  page = 1,
  limit = 10,
  search,
  type,
  sortBy,
  sortOrder,
}) {
  const normalizedPage = Number(page) || 1;
  const normalizedLimit = Number(limit) || 10;
  const requestedTypes = getRequestedTypes(type);
  const typeData = await Promise.all(
    requestedTypes.map((stockType) => fetchTypeData({ type: stockType, search })),
  );
  const allItems = dedupeByTypeAndStockId(typeData.flat());

  if (allItems.some(hasInvalidQuantity)) {
    throw new Error('Finished goods stock contains a negative quantity.');
  }

  const sortedItems = sortStockItems(allItems, { sortBy, sortOrder });
  const totalItems = sortedItems.length;
  const skip = (normalizedPage - 1) * normalizedLimit;

  return {
    data: sortedItems.slice(skip, skip + normalizedLimit),
    pagination: buildPagination({
      page: normalizedPage,
      limit: normalizedLimit,
      totalItems,
    }),
    summary: buildSummary(allItems),
  };
}

export { STOCK_TYPES, TYPE_ALIASES };
