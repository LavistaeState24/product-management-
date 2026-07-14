import SheetProductionBatch from '../models/SheetProductionBatch.js';
import SheetStock from '../models/SheetStock.js';
import {
  createSheetProductionBatch,
  deleteSheetProductionBatch,
  formatSheetProductionBatch,
  formatSheetStock,
  updateSheetProductionBatch,
} from '../services/sheetProductionService.js';
import { buildPagination, buildSearchFilter } from '../utils/queryHelpers.js';

function parseSheetProductionPayload(body) {
  return {
    rawMaterialStockId: body.rawMaterialStockId,
    quantityUsed: Number(body.quantityUsed),
    dateTime: new Date(body.dateTime || Date.now()),
    remarks: body.remarks?.trim() || '',
    sheets: (body.sheets || []).map((sheet) => ({
      itemNumber: sheet.itemNumber?.trim() || '',
      itemName: sheet.itemName?.trim(),
      size: sheet.size?.trim(),
      colour: sheet.colour?.trim(),
      weight: Number(sheet.weight),
      quantity: Number(sheet.quantity),
    })),
  };
}

const sheetProductionSearchFields = [
  'rawMaterialItem',
  'batchNumber',
  'batchId',
  'remarks',
  'sheets.itemNumber',
  'sheets.itemName',
  'sheets.size',
  'sheets.colour',
];

const sheetStockSearchFields = [
  'itemNumber',
  'itemName',
  'size',
  'colour',
  { field: 'weight', type: 'number' },
];

export async function createSheetProduction(req, res) {
  const payload = parseSheetProductionPayload(req.body);
  const { batch, consumption, sheetStocks } = await createSheetProductionBatch({
    payload,
    createdBy: req.user._id,
  });

  return res.status(201).json({
    message: 'Sheet production batch created successfully.',
    batch: formatSheetProductionBatch(batch),
    consumptionId: consumption._id,
    sheetStocks: sheetStocks.map(formatSheetStock),
  });
}

export async function updateSheetProduction(req, res) {
  const payload = parseSheetProductionPayload(req.body);
  const { batch, consumption, sheetStocks } = await updateSheetProductionBatch({
    batchId: req.params.id,
    payload,
    updatedBy: req.user._id,
  });

  return res.status(200).json({
    message: 'Sheet production batch updated successfully.',
    batch: formatSheetProductionBatch(batch),
    consumptionId: consumption._id,
    sheetStocks: sheetStocks.map(formatSheetStock),
  });
}

export async function deleteSheetProduction(req, res) {
  const { batch } = await deleteSheetProductionBatch({
    batchId: req.params.id,
  });

  return res.status(200).json({
    message: 'Sheet production batch deleted successfully.',
    batch: formatSheetProductionBatch(batch),
  });
}

export async function listSheetProductions(req, res) {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const search = req.query.search?.trim();
  const filter = buildSearchFilter(search, sheetProductionSearchFields);

  const skip = (page - 1) * limit;
  const [items, totalItems] = await Promise.all([
    SheetProductionBatch.find(filter)
      .populate('rawMaterialStockId')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .sort({ dateTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SheetProductionBatch.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatSheetProductionBatch),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function listSheetStocks(req, res) {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const search = req.query.search?.trim();
  const filter = buildSearchFilter(search, sheetStockSearchFields);

  const skip = (page - 1) * limit;
  const [items, totalItems] = await Promise.all([
    SheetStock.find(filter)
      .populate('productionBatchId')
      .populate('createdBy', 'name email role')
      .sort({ productionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SheetStock.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatSheetStock),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function searchSheetStocks(req, res) {
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const search = req.query.q?.trim() || req.query.search?.trim();
  const filter = buildSearchFilter(search, sheetStockSearchFields);

  const skip = (page - 1) * limit;
  const [items, totalItems] = await Promise.all([
    SheetStock.find(filter)
      .sort({ itemNumber: 1 })
      .skip(skip)
      .limit(limit),
    SheetStock.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatSheetStock),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}
