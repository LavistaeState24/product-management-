import RodProductionBatch from '../models/RodProductionBatch.js';
import RodStock from '../models/RodStock.js';
import {
  createRodProductionBatch,
  formatRodProductionBatch,
  formatRodStock,
} from '../services/rodProductionService.js';

function parseRodProductionPayload(body) {
  return {
    rawMaterialStockId: body.rawMaterialStockId,
    quantityUsed: Number(body.quantityUsed),
    dateTime: new Date(body.dateTime || Date.now()),
    remarks: body.remarks?.trim() || '',
    rods: (body.rods || []).map((rod) => ({
      item: rod.item?.trim(),
      size: rod.size?.trim(),
      weightKg: Number(rod.weightKg),
      colour: rod.colour?.trim(),
      quantity: Number(rod.quantity),
      itemNumber: rod.itemNumber?.trim(),
      isManualItemNumber: rod.isManualItemNumber === true || rod.isManualItemNumber === 'true',
    })),
  };
}

function buildPagination({ page, limit, totalItems }) {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  };
}

export async function createRodProduction(req, res) {
  const payload = parseRodProductionPayload(req.body);
  const { batch, consumption, rodStocks } = await createRodProductionBatch({
    payload,
    createdBy: req.user._id,
  });

  return res.status(201).json({
    message: 'Rod production batch created successfully.',
    batch: formatRodProductionBatch(batch),
    consumptionId: consumption._id,
    rodStocks: rodStocks.map(formatRodStock),
  });
}

export async function listRodProductions(req, res) {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const search = req.query.search?.trim();
  const filter = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { rawMaterialItem: regex },
      { batchNumber: regex },
      { batchId: regex },
      { remarks: regex },
      { 'rods.item': regex },
      { 'rods.size': regex },
      { 'rods.colour': regex },
      { 'rods.itemNumber': regex },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, totalItems] = await Promise.all([
    RodProductionBatch.find(filter)
      .populate('rawMaterialStockId')
      .populate('createdBy', 'name email role')
      .sort({ dateTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RodProductionBatch.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatRodProductionBatch),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function listRodStocks(req, res) {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const search = req.query.search?.trim();
  const filter = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { itemNumber: regex },
      { item: regex },
      { size: regex },
      { colour: regex },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, totalItems] = await Promise.all([
    RodStock.find(filter)
      .populate('productionBatchId')
      .sort({ productionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RodStock.countDocuments(filter),
  ]);

  return res.status(200).json({
    items: items.map(formatRodStock),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

export async function searchRodStocks(req, res) {
  const search = req.query.q?.trim() || req.query.search?.trim();
  const limit = req.query.limit || 20;
  const filter = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { itemNumber: regex },
      { item: regex },
      { size: regex },
      { colour: regex },
    ];
  }

  const items = await RodStock.find(filter)
    .sort({ itemNumber: 1 })
    .limit(limit);

  return res.status(200).json({
    items: items.map(formatRodStock),
  });
}
