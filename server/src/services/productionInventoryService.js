import mongoose from 'mongoose';
import RawMaterialStock from '../models/RawMaterialStock.js';
import RawMaterialConsumption from '../models/RawMaterialConsumption.js';
import { createHttpError } from '../utils/httpError.js';
import { roundCurrency } from '../utils/purchaseMath.js';

export function formatDateSegment(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
}

export async function runProductionTransaction(work) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await work(session);
    });

    return result;
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function generateProductionNumber({
  Model,
  dateTime,
  prefix,
  sequenceField = 'batchNumber',
  session,
}) {
  const dateSegment = formatDateSegment(dateTime);
  const numberPrefix = `${prefix}-${dateSegment}`;
  const count = await Model.countDocuments({
    [sequenceField]: new RegExp(`^${numberPrefix}-`),
  }).session(session);

  return `${numberPrefix}-${String(count + 1).padStart(4, '0')}`;
}

export function assertPositiveQuantity(value, message) {
  if (!Number.isFinite(value) || value <= 0) {
    throw createHttpError(422, message);
  }
}

export function assertUniqueValues(values, buildMessage) {
  const seen = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      throw createHttpError(409, buildMessage(value));
    }

    seen.add(value);
  }
}

export function assertProductionItems({
  items,
  itemLabel,
  emptyMessage,
  requiredStringFields = [],
  positiveNumberFields = [],
  positiveIntegerFields = [],
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(422, emptyMessage);
  }

  items.forEach((item, index) => {
    const position = index + 1;

    requiredStringFields.forEach(({ key, label }) => {
      if (!item[key]) {
        throw createHttpError(422, `${itemLabel} ${position}: ${label} is required.`);
      }
    });

    positiveNumberFields.forEach(({ key, label }) => {
      if (!Number.isFinite(item[key]) || item[key] <= 0) {
        throw createHttpError(422, `${itemLabel} ${position}: ${label} must be greater than 0.`);
      }
    });

    positiveIntegerFields.forEach(({ key, label }) => {
      if (!Number.isInteger(item[key]) || item[key] <= 0) {
        throw createHttpError(422, `${itemLabel} ${position}: ${label} must be greater than 0.`);
      }
    });
  });
}

export async function assertFinishedItemNumbersAvailable({
  StockModel,
  itemNumbers,
  session,
  itemNumberField = 'itemNumber',
  buildMessage,
}) {
  const existing = await StockModel.findOne({ [itemNumberField]: { $in: itemNumbers } })
    .session(session)
    .lean();

  if (existing) {
    throw createHttpError(409, buildMessage(existing[itemNumberField]));
  }
}

export async function findRawMaterialStockOrThrow(rawMaterialStockId, session) {
  const rawMaterialStock = await RawMaterialStock.findById(rawMaterialStockId).session(session);

  if (!rawMaterialStock) {
    throw createHttpError(404, 'Raw material stock not found.');
  }

  return rawMaterialStock;
}

export async function findStockByIdOrThrow({
  StockModel,
  stockId,
  session,
  notFoundMessage,
}) {
  const stock = await StockModel.findById(stockId).session(session);

  if (!stock) {
    throw createHttpError(404, notFoundMessage);
  }

  return stock;
}

export function validateStockAvailability({
  stock,
  quantityUsed,
  itemLabel = 'stock',
  quantityField = 'quantity',
}) {
  const nextQuantity = roundCurrency(stock[quantityField] - quantityUsed);

  if (nextQuantity < 0) {
    throw createHttpError(
      400,
      `Insufficient ${itemLabel} for "${stock.itemName || stock.item}". Available: ${stock[quantityField]}, required: ${quantityUsed}.`,
    );
  }

  return nextQuantity;
}

export function validateRawMaterialAvailability(rawMaterialStock, quantityUsed) {
  return validateStockAvailability({
    stock: rawMaterialStock,
    quantityUsed,
    itemLabel: 'raw material stock',
  });
}

export async function deductStock({
  stock,
  quantityUsed,
  session,
  itemLabel = 'stock',
  quantityField = 'quantity',
}) {
  stock[quantityField] = validateStockAvailability({
    stock,
    quantityUsed,
    itemLabel,
    quantityField,
  });
  await stock.save({ session });
  return stock;
}

export async function deductRawMaterialStock({ rawMaterialStock, quantityUsed, session }) {
  return deductStock({
    stock: rawMaterialStock,
    quantityUsed,
    session,
    itemLabel: 'raw material stock',
  });
}

export async function restoreStock({
  stock,
  quantity,
  session,
  quantityField = 'quantity',
}) {
  stock[quantityField] = roundCurrency(stock[quantityField] + quantity);
  await stock.save({ session });
  return stock;
}

export async function restoreRawMaterialStock({ rawMaterialStock, quantity, session }) {
  return restoreStock({
    stock: rawMaterialStock,
    quantity,
    session,
  });
}

export async function createProductionBatch({ BatchModel, batchDocument, session }) {
  const [batch] = await BatchModel.create([batchDocument], { session });
  return batch;
}

export async function createRawMaterialConsumption({ consumptionDocument, session }) {
  const [consumption] = await RawMaterialConsumption.create([consumptionDocument], { session });
  return consumption;
}

export async function createFinishedStockItems({ StockModel, stockDocuments, session }) {
  return StockModel.create(stockDocuments, {
    session,
    ordered: true,
  });
}

export async function removeFinishedStockItems({ StockModel, productionBatchId, session }) {
  return StockModel.deleteMany({ productionBatchId }, { session });
}
