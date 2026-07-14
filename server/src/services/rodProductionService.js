import RodProductionBatch from '../models/RodProductionBatch.js';
import RodStock from '../models/RodStock.js';
import { createHttpError } from '../utils/httpError.js';
import {
  assertFinishedItemNumbersAvailable,
  assertPositiveQuantity,
  assertProductionItems,
  assertUniqueValues,
  createFinishedStockItems,
  createProductionBatch,
  createRawMaterialConsumption,
  deductRawMaterialStock,
  findRawMaterialStockOrThrow,
  generateProductionNumber,
  runProductionTransaction,
} from './productionInventoryService.js';

async function generateBatchNumber(dateTime, session) {
  return generateProductionNumber({
    Model: RodProductionBatch,
    dateTime,
    prefix: 'RPB',
    session,
  });
}

function assertUniqueItemNumbers(itemNumbers) {
  assertUniqueValues(
    itemNumbers,
    (itemNumber) => `Duplicate rod item number "${itemNumber}" in this batch.`,
  );
}

async function assertItemNumbersAvailable(itemNumbers, session) {
  await assertFinishedItemNumbersAvailable({
    StockModel: RodStock,
    itemNumbers,
    session,
    buildMessage: (itemNumber) => `Rod item number "${itemNumber}" already exists.`,
  });
}

function assertRodPayload(rods) {
  assertProductionItems({
    items: rods,
    itemLabel: 'Rod',
    emptyMessage: 'At least one rod item is required.',
    requiredStringFields: [
      { key: 'item', label: 'item' },
      { key: 'size', label: 'size' },
      { key: 'colour', label: 'colour' },
      { key: 'itemNumber', label: 'item number' },
    ],
    positiveNumberFields: [
      { key: 'weightKg', label: 'weight' },
      { key: 'quantity', label: 'quantity' },
    ],
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
  assertPositiveQuantity(payload.quantityUsed, 'Quantity used must be greater than 0.');

  assertRodPayload(payload.rods);

  const itemNumbers = payload.rods.map((rod) => rod.itemNumber);
  assertUniqueItemNumbers(itemNumbers);

  try {
    return await runProductionTransaction(async (session) => {
      const rawMaterialStock = await findRawMaterialStockOrThrow(
        payload.rawMaterialStockId,
        session,
      );

      await assertItemNumbersAvailable(itemNumbers, session);

      const batchNumber = await generateBatchNumber(payload.dateTime, session);

      const batch = await createProductionBatch({
        BatchModel: RodProductionBatch,
        batchDocument: {
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
        session,
      });

      const consumption = await createRawMaterialConsumption({
        consumptionDocument: {
          rawMaterialItem: rawMaterialStock.itemName,
          rawMaterialStockId: rawMaterialStock._id,
          rodProductionBatchId: batch._id,
          quantityUsed: payload.quantityUsed,
          dateTime: payload.dateTime,
          remarks: payload.remarks,
          createdBy,
        },
        session,
      });

      await deductRawMaterialStock({
        rawMaterialStock,
        quantityUsed: payload.quantityUsed,
        session,
      });

      const rodStocks = await createFinishedStockItems({
        StockModel: RodStock,
        stockDocuments: payload.rods.map((rod) => ({
          itemNumber: rod.itemNumber,
          item: rod.item,
          size: rod.size,
          colour: rod.colour,
          weightKg: rod.weightKg,
          quantity: rod.quantity,
          productionDate: payload.dateTime,
          productionBatchId: batch._id,
        })),
        session,
      });

      return {
        batch,
        consumption,
        rodStocks,
      };
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(409, 'Rod production contains a duplicate unique value.');
    }

    throw error;
  }
}
