import SheetProductManufacturingBatch from '../models/SheetProductManufacturingBatch.js';
import SheetProductStock from '../models/SheetProductStock.js';
import {
  createSheetProductManufacturingBatch,
  formatSheetProductManufacturingBatch,
  formatSheetProductStock,
} from '../services/sheetProductManufacturingService.js';
import { buildPagination, buildSearchFilter } from '../utils/queryHelpers.js';

const manufacturingSearchFields = [
  'sheetItem',
  'productName',
  'size',
  'colour',
  'sellingUnit',
  'itemNumber',
  'batchNumber',
  'batchId',
  'remarks',
];

const sheetProductStockSearchFields = [
  'itemNumber',
  'productName',
  'size',
  'colour',
  'sellingUnit',
];

function parseSheetProductManufacturingPayload(body) {
  return {
    sheetStockId: body.sheetStockId,
    quantityUsed: Number(body.quantityUsed),
    productName: body.productName?.trim(),
    size: body.size?.trim(),
    colour: body.colour?.trim(),
    sellingUnit: body.sellingUnit,
    quantity: Number(body.quantity),
    itemNumber: body.itemNumber?.trim() || '',
    dateTime: new Date(body.dateTime || Date.now()),
    remarks: body.remarks?.trim() || '',
  };
}

export async function createSheetProductManufacturing(req, res) {
  const payload = parseSheetProductManufacturingPayload(req.body);
  const { batch, sheetProductStock } = await createSheetProductManufacturingBatch({
    payload,
    createdBy: req.user._id,
  });

  return res.status(201).json({
    message: 'Sheet product manufacturing batch created successfully.',
    batch: formatSheetProductManufacturingBatch(batch),
    sheetProductStock: formatSheetProductStock(sheetProductStock),
  });
}

export async function listSheetProductManufacturing(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const search = req.query.search?.trim();
  const filter = buildSearchFilter(search, manufacturingSearchFields);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    SheetProductManufacturingBatch.find(filter)
      .populate('sheetStockId')
      .populate('createdBy', 'name email role')
      .sort({ dateTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SheetProductManufacturingBatch.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatSheetProductManufacturingBatch),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function getSheetProductManufacturing(req, res) {
  const batch = await SheetProductManufacturingBatch.findById(req.params.id)
    .populate('sheetStockId')
    .populate('createdBy', 'name email role');

  if (!batch) {
    return res.status(404).json({
      message: 'Sheet product manufacturing batch not found.',
    });
  }

  return res.status(200).json({
    batch: formatSheetProductManufacturingBatch(batch),
  });
}

export async function listSheetProductStock(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const search = req.query.search?.trim();
  const filter = buildSearchFilter(search, sheetProductStockSearchFields);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    SheetProductStock.find(filter)
      .populate('manufacturingBatchId')
      .populate('createdBy', 'name email role')
      .sort({ productionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SheetProductStock.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatSheetProductStock),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function searchSheetProductStock(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const search = req.query.q?.trim() || req.query.search?.trim();
  const filter = buildSearchFilter(search, sheetProductStockSearchFields);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    SheetProductStock.find(filter).sort({ itemNumber: 1 }).skip(skip).limit(limit),
    SheetProductStock.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatSheetProductStock),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function getSheetProductStock(req, res) {
  const stock = await SheetProductStock.findById(req.params.id)
    .populate('manufacturingBatchId')
    .populate('createdBy', 'name email role');

  if (!stock) {
    return res.status(404).json({
      message: 'Sheet product stock not found.',
    });
  }

  return res.status(200).json({
    stock: formatSheetProductStock(stock),
  });
}
