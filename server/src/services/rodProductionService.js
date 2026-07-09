import mongoose from 'mongoose';
import RawMaterialStock from '../models/RawMaterialStock.js';
import RawMaterialConsumption from '../models/RawMaterialConsumption.js';
import RodProductionBatch from '../models/RodProductionBatch.js';
import RodStock from '../models/RodStock.js';
import { createHttpError } from '../utils/httpError.js';
import { roundCurrency } from '../utils/purchaseMath.js';

function formatDateSegment(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
}

async function generateBatchNumber(dateTime, session) {
  const dateSegment = formatDateSegment(dateTime);
  const prefix = `RPB-${dateSegment}`;
  const count = await RodProductionBatch.countDocuments({
    batchNumber: new RegExp(`^${prefix}-`),
  }).session(session);

  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

function assertUniqueItemNumbers(itemNumbers) {
  const seen = new Set();

  for (const itemNumber of itemNumbers) {
    if (seen.has(itemNumber)) {
      throw createHttpError(409, `Duplicate rod item number "${itemNumber}" in this batch.`);
    }

    seen.add(itemNumber);
  }
}

async function assertItemNumbersAvailable(itemNumbers, session) {
  const existing = await RodStock.findOne({ itemNumber: { $in: itemNumbers } })
    .session(session)
    .lean();

  if (existing) {
    throw createHttpError(409, `Rod item number "${existing.itemNumber}" already exists.`);
  }
}

function assertRodPayload(rods) {
  if (!Array.isArray(rods) || rods.length === 0) {
    throw createHttpError(422, 'At least one rod item is required.');
  }

  rods.forEach((rod, index) => {
    const position = index + 1;

    if (!rod.item) {
      throw createHttpError(422, `Rod ${position}: item is required.`);
    }

    if (!rod.size) {
      throw createHttpError(422, `Rod ${position}: size is required.`);
    }

    if (!rod.colour) {
      throw createHttpError(422, `Rod ${position}: colour is required.`);
    }

    if (!rod.itemNumber) {
      throw createHttpError(422, `Rod ${position}: item number is required.`);
    }

    if (!Number.isFinite(rod.weightKg) || rod.weightKg <= 0) {
      throw createHttpError(422, `Rod ${position}: weight must be greater than 0.`);
    }

    if (!Number.isFinite(rod.quantity) || rod.quantity <= 0) {
      throw createHttpError(422, `Rod ${position}: quantity must be greater than 0.`);
    }
  });
}

export function formatRodStock(stock) {
  return {
    id: stock._id,
    itemNumber: stock.itemNumber,
    item: stock.item,
    size: stock.size,
    colour: stock.colour,
    weightKg: stock.weightKg,
    quantity: stock.quantity,
    productionDate: stock.productionDate,
    productionBatchId: stock.productionBatchId,
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
  };
}

export function formatRodProductionBatch(batch) {
  return {
    id: batch._id,
    rawMaterialItem: batch.rawMaterialItem,
    rawMaterialStockId: batch.rawMaterialStockId,
    quantityUsed: batch.quantityUsed,
    dateTime: batch.dateTime,
    remarks: batch.remarks,
    rods: batch.rods,
    batchNumber: batch.batchNumber,
    batchId: batch.batchId,
    createdBy: batch.createdBy,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

export async function createRodProductionBatch({ payload, createdBy }) {
  if (!Number.isFinite(payload.quantityUsed) || payload.quantityUsed <= 0) {
    throw createHttpError(422, 'Quantity used must be greater than 0.');
  }

  assertRodPayload(payload.rods);

  const itemNumbers = payload.rods.map((rod) => rod.itemNumber);
  assertUniqueItemNumbers(itemNumbers);

  const session = await mongoose.startSession();
  let batch = null;
  let consumption = null;
  let rodStocks = [];

  try {
    await session.withTransaction(async () => {
      const rawMaterialStock = await RawMaterialStock.findById(payload.rawMaterialStockId).session(
        session,
      );

      if (!rawMaterialStock) {
        throw createHttpError(404, 'Raw material stock not found.');
      }

      const nextRawMaterialQuantity = roundCurrency(
        rawMaterialStock.quantity - payload.quantityUsed,
      );

      if (nextRawMaterialQuantity < 0) {
        throw createHttpError(
          400,
          `Insufficient raw material stock for "${rawMaterialStock.itemName}". Available: ${rawMaterialStock.quantity}, required: ${payload.quantityUsed}.`,
        );
      }

      await assertItemNumbersAvailable(itemNumbers, session);

      const batchNumber = await generateBatchNumber(payload.dateTime, session);
      const [createdBatch] = await RodProductionBatch.create(
        [
          {
            rawMaterialItem: rawMaterialStock.itemName,
            rawMaterialStockId: rawMaterialStock._id,
            quantityUsed: payload.quantityUsed,
            dateTime: payload.dateTime,
            remarks: payload.remarks,
            rods: payload.rods,
            batchNumber,
            batchId: batchNumber,
            createdBy,
          },
        ],
        { session },
      );
      batch = createdBatch;

      const [createdConsumption] = await RawMaterialConsumption.create(
        [
          {
            rawMaterialItem: rawMaterialStock.itemName,
            rawMaterialStockId: rawMaterialStock._id,
            rodProductionBatchId: batch._id,
            quantityUsed: payload.quantityUsed,
            dateTime: payload.dateTime,
            remarks: payload.remarks,
            createdBy,
          },
        ],
        { session },
      );
      consumption = createdConsumption;

      rawMaterialStock.quantity = nextRawMaterialQuantity;
      await rawMaterialStock.save({ session });

      rodStocks = await RodStock.create(
        payload.rods.map((rod) => ({
          itemNumber: rod.itemNumber,
          item: rod.item,
          size: rod.size,
          colour: rod.colour,
          weightKg: rod.weightKg,
          quantity: rod.quantity,
          productionDate: payload.dateTime,
          productionBatchId: batch._id,
        })),
        { session },
      );
    });
  } catch (error) {
    await session.abortTransaction().catch(() => {});

    if (error.code === 11000) {
      throw createHttpError(409, 'Rod production contains a duplicate unique value.');
    }

    throw error;
  } finally {
    await session.endSession();
  }

  return {
    batch,
    consumption,
    rodStocks,
  };
}
