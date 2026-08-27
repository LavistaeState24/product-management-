import RodProductManufacturingBatch from '../models/RodProductManufacturingBatch.js';
import RodProductStock from '../models/RodProductStock.js';
import {
  createRodProductManufacturingBatch,
  formatRodProductManufacturingBatch,
  formatRodProductStock,
} from '../services/rodProductManufacturingService.js';
import { buildPagination, buildSearchFilter } from '../utils/queryHelpers.js';

const manufacturingSearchFields = [
  'rodItem',
  'productName',
  'size',
  'colour',
  'sellingUnit',
  'itemNumber',
  'batchNumber',
  'batchId',
  'remarks',
];

const rodProductStockSearchFields = [
  'itemNumber',
  'productName',
  'size',
  'colour',
  'sellingUnit',
];

function parseRodProductManufacturingPayload(body) {
  return {
    rodStockId: body.rodStockId,
    quantityUsed: Number(body.quantityUsed),
    productName: body.productName?.trim(),
    size: body.size?.trim(),
    colour: body.colour?.trim(),
    drawingNumber: body.drawingNumber?.trim() || '',
    photo: body.photo?.trim() || '',
    sellingUnit: body.sellingUnit,
    quantity: Number(body.quantity),
    itemNumber: body.itemNumber?.trim() || '',
    dateTime: new Date(body.dateTime || Date.now()),
    remarks: body.remarks?.trim() || '',
  };
}

export async function createRodProductManufacturing(req, res) {
  const payload = parseRodProductManufacturingPayload(req.body);
  const { batch, rodProductStock } = await createRodProductManufacturingBatch({
    payload,
    createdBy: req.user._id,
  });

  return res.status(201).json({
    message: 'Rod product manufacturing batch created successfully.',
    batch: formatRodProductManufacturingBatch(batch),
    rodProductStock: formatRodProductStock(rodProductStock),
  });
}

export async function listRodProductManufacturing(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const search = req.query.search?.trim();
  const filter = buildSearchFilter(search, manufacturingSearchFields);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    RodProductManufacturingBatch.find(filter)
      .populate('rodStockId')
      .populate('createdBy', 'name email role')
      .sort({ dateTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RodProductManufacturingBatch.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatRodProductManufacturingBatch),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function getRodProductManufacturing(req, res) {
  const batch = await RodProductManufacturingBatch.findById(req.params.id)
    .populate('rodStockId')
    .populate('createdBy', 'name email role');

  if (!batch) {
    return res.status(404).json({
      message: 'Rod product manufacturing batch not found.',
    });
  }

  return res.status(200).json({
    batch: formatRodProductManufacturingBatch(batch),
  });
}

export async function listRodProductStock(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const search = req.query.search?.trim();
  const filter = buildSearchFilter(search, rodProductStockSearchFields);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    RodProductStock.find(filter)
      .populate('manufacturingBatchId')
      .populate('createdBy', 'name email role')
      .sort({ productionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RodProductStock.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatRodProductStock),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function searchRodProductStock(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const search = req.query.q?.trim() || req.query.search?.trim();
  const filter = buildSearchFilter(search, rodProductStockSearchFields);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    RodProductStock.find(filter).sort({ itemNumber: 1 }).skip(skip).limit(limit),
    RodProductStock.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatRodProductStock),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function getRodProductStock(req, res) {
  const stock = await RodProductStock.findById(req.params.id)
    .populate('manufacturingBatchId')
    .populate('createdBy', 'name email role');

  if (!stock) {
    return res.status(404).json({
      message: 'Rod product stock not found.',
    });
  }

  return res.status(200).json({
    stock: formatRodProductStock(stock),
  });
}
