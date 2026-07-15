import PUProductManufacturingBatch from '../models/PUProductManufacturingBatch.js';
import PUProductStock from '../models/PUProductStock.js';
import {
  createPUProductManufacturingBatch,
  deletePUProductManufacturingBatch,
  formatPUProductManufacturingBatch,
  formatPUProductStock,
  updatePUProductManufacturingBatch,
} from '../services/puProductManufacturingService.js';
import { buildPagination, buildSearchFilter } from '../utils/queryHelpers.js';

const manufacturingSearchFields = [
  'puChemicalItem',
  'mocaItem',
  'productName',
  'size',
  'colour',
  'sellingUnit',
  'itemNumber',
  'batchNumber',
  'batchId',
  'remarks',
];

const puProductStockSearchFields = [
  'itemNumber',
  'productName',
  'size',
  'colour',
  'sellingUnit',
];

function parsePUProductManufacturingPayload(body) {
  return {
    puChemicalStockId: body.puChemicalStockId,
    chemicalQuantityKg: Number(body.chemicalQuantityKg),
    mocaStockId: body.mocaStockId,
    mocaQuantityKg: Number(body.mocaQuantityKg),
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

export async function createPUProductManufacturing(req, res) {
  const payload = parsePUProductManufacturingPayload(req.body);
  const { batch, puProductStock } = await createPUProductManufacturingBatch({
    payload,
    createdBy: req.user._id,
  });

  return res.status(201).json({
    message: 'PU product manufacturing batch created successfully.',
    batch: formatPUProductManufacturingBatch(batch),
    puProductStock: formatPUProductStock(puProductStock),
  });
}

export async function updatePUProductManufacturing(req, res) {
  const payload = parsePUProductManufacturingPayload(req.body);
  const { batch, puProductStock } = await updatePUProductManufacturingBatch({
    batchId: req.params.id,
    payload,
  });

  return res.status(200).json({
    message: 'PU product manufacturing batch updated successfully.',
    batch: formatPUProductManufacturingBatch(batch),
    puProductStock: formatPUProductStock(puProductStock),
  });
}

export async function deletePUProductManufacturing(req, res) {
  const { batch } = await deletePUProductManufacturingBatch({
    batchId: req.params.id,
  });

  return res.status(200).json({
    message: 'PU product manufacturing batch deleted successfully.',
    batch: formatPUProductManufacturingBatch(batch),
  });
}

export async function listPUProductManufacturing(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const search = req.query.search?.trim();
  const filter = buildSearchFilter(search, manufacturingSearchFields);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    PUProductManufacturingBatch.find(filter)
      .populate('puChemicalStockId')
      .populate('mocaStockId')
      .populate('createdBy', 'name email role')
      .sort({ dateTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PUProductManufacturingBatch.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatPUProductManufacturingBatch),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function getPUProductManufacturing(req, res) {
  const batch = await PUProductManufacturingBatch.findById(req.params.id)
    .populate('puChemicalStockId')
    .populate('mocaStockId')
    .populate('createdBy', 'name email role');

  if (!batch) {
    return res.status(404).json({
      message: 'PU product manufacturing batch not found.',
    });
  }

  return res.status(200).json({
    batch: formatPUProductManufacturingBatch(batch),
  });
}

export async function listPUProductStock(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const search = req.query.search?.trim();
  const filter = buildSearchFilter(search, puProductStockSearchFields);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    PUProductStock.find(filter)
      .populate('manufacturingBatchId')
      .populate('createdBy', 'name email role')
      .sort({ productionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PUProductStock.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatPUProductStock),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function searchPUProductStock(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const search = req.query.q?.trim() || req.query.search?.trim();
  const filter = buildSearchFilter(search, puProductStockSearchFields);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    PUProductStock.find(filter)
      .sort({ itemNumber: 1 })
      .skip(skip)
      .limit(limit),
    PUProductStock.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatPUProductStock),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function getPUProductStock(req, res) {
  const stock = await PUProductStock.findById(req.params.id)
    .populate('manufacturingBatchId')
    .populate('createdBy', 'name email role');

  if (!stock) {
    return res.status(404).json({
      message: 'PU product stock not found.',
    });
  }

  return res.status(200).json({
    stock: formatPUProductStock(stock),
  });
}
