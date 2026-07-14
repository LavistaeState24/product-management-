import RawMaterialConsumption from '../models/RawMaterialConsumption.js';
import SheetProductionBatch from '../models/SheetProductionBatch.js';
import SheetStock from '../models/SheetStock.js';
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
  removeFinishedStockItems,
  restoreRawMaterialStock,
  runProductionTransaction,
} from './productionInventoryService.js';

const SHEET_ITEM_NUMBER_PREFIX = 'SHT';

async function generateBatchNumber(dateTime, session) {
  return generateProductionNumber({
    Model: SheetProductionBatch,
    dateTime,
    prefix: 'SPB',
    session,
  });
}

function formatSheetItemNumber(sequence) {
  return `${SHEET_ITEM_NUMBER_PREFIX}-${String(sequence).padStart(6, '0')}`;
}

function parseSheetItemNumberSequence(itemNumber = '') {
  const match = itemNumber.match(/^SHT-(\d{6})$/);
  return match ? Number(match[1]) : 0;
}

async function getNextSheetItemNumbers(count, session, reservedItemNumbers = []) {
  if (count <= 0) {
    return [];
  }

  const latestStock = await SheetStock.findOne({
    itemNumber: /^SHT-\d{6}$/,
  })
    .sort({ itemNumber: -1 })
    .session(session)
    .lean();
  const latestSequence = parseSheetItemNumberSequence(latestStock?.itemNumber);
  const reservedSequence = Math.max(
    0,
    ...reservedItemNumbers.map((itemNumber) => parseSheetItemNumberSequence(itemNumber)),
  );
  const start = Math.max(latestSequence, reservedSequence) + 1;

  return Array.from({ length: count }, (_, index) => formatSheetItemNumber(start + index));
}

async function assignSheetItemNumbers(sheets, session) {
  const missingCount = sheets.filter((sheet) => !sheet.itemNumber).length;
  const reservedItemNumbers = sheets
    .map((sheet) => sheet.itemNumber)
    .filter(Boolean);
  const generatedItemNumbers = await getNextSheetItemNumbers(
    missingCount,
    session,
    reservedItemNumbers,
  );
  let generatedIndex = 0;

  return sheets.map((sheet) => {
    if (sheet.itemNumber) {
      return sheet;
    }

    const itemNumber = generatedItemNumbers[generatedIndex];
    generatedIndex += 1;

    return {
      ...sheet,
      itemNumber,
    };
  });
}

function assertUniqueItemNumbers(itemNumbers) {
  assertUniqueValues(
    itemNumbers,
    (itemNumber) => `Duplicate sheet item number "${itemNumber}" in this batch.`,
  );
}

async function assertItemNumbersAvailable(itemNumbers, session) {
  await assertFinishedItemNumbersAvailable({
    StockModel: SheetStock,
    itemNumbers,
    session,
    buildMessage: (itemNumber) => `Sheet item number "${itemNumber}" already exists.`,
  });
}

function assertSheetPayload(sheets, { requireItemNumber = true } = {}) {
  assertProductionItems({
    items: sheets,
    itemLabel: 'Sheet',
    emptyMessage: 'At least one sheet item is required.',
    requiredStringFields: [
      ...(requireItemNumber ? [{ key: 'itemNumber', label: 'item number' }] : []),
      { key: 'itemName', label: 'item name' },
      { key: 'size', label: 'size' },
      { key: 'colour', label: 'colour' },
    ],
    positiveNumberFields: [{ key: 'weight', label: 'weight' }],
    positiveIntegerFields: [{ key: 'quantity', label: 'quantity' }],
  });
}

async function findSheetProductionBatchOrThrow(batchId, session) {
  const batch = await SheetProductionBatch.findById(batchId).session(session);

  if (!batch) {
    throw createHttpError(404, 'Sheet production batch not found.');
  }

  return batch;
}

function buildSheetStockDocuments({ sheets, batch, createdBy }) {
  return sheets.map((sheet) => ({
    itemNumber: sheet.itemNumber,
    itemName: sheet.itemName,
    size: sheet.size,
    colour: sheet.colour,
    weight: sheet.weight,
    quantity: sheet.quantity,
    productionDate: batch.dateTime,
    productionBatchId: batch._id,
    createdBy,
  }));
}

export function formatSheetStock(stock) {
  return {
    id: stock._id,
    itemNumber: stock.itemNumber,
    itemName: stock.itemName,
    size: stock.size,
    colour: stock.colour,
    weight: stock.weight,
    quantity: stock.quantity,
    productionDate: stock.productionDate,
    productionBatchId: stock.productionBatchId,
    createdBy: stock.createdBy,
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
  };
}

export function formatSheetProductionBatch(batch) {
  return {
    id: batch._id,
    rawMaterialItem: batch.rawMaterialItem,
    rawMaterialStockId: batch.rawMaterialStockId,
    quantityUsed: batch.quantityUsed,
    dateTime: batch.dateTime,
    remarks: batch.remarks,
    sheets: batch.sheets,
    batchNumber: batch.batchNumber,
    batchId: batch.batchId,
    createdBy: batch.createdBy,
    updatedBy: batch.updatedBy,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

export async function createSheetProductionBatch({ payload, createdBy }) {
  assertPositiveQuantity(payload.quantityUsed, 'Quantity used must be greater than 0.');
  assertSheetPayload(payload.sheets, { requireItemNumber: false });

  try {
    return await runProductionTransaction(async (session) => {
      const rawMaterialStock = await findRawMaterialStockOrThrow(
        payload.rawMaterialStockId,
        session,
      );
      const sheets = await assignSheetItemNumbers(payload.sheets, session);
      const itemNumbers = sheets.map((sheet) => sheet.itemNumber);

      assertSheetPayload(sheets);
      assertUniqueItemNumbers(itemNumbers);
      await assertItemNumbersAvailable(itemNumbers, session);

      const batchNumber = await generateBatchNumber(payload.dateTime, session);
      const batch = await createProductionBatch({
        BatchModel: SheetProductionBatch,
        batchDocument: {
          rawMaterialItem: rawMaterialStock.itemName,
          rawMaterialStockId: rawMaterialStock._id,
          quantityUsed: payload.quantityUsed,
          dateTime: payload.dateTime,
          remarks: payload.remarks,
          sheets,
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
          sheetProductionBatchId: batch._id,
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

      const sheetStocks = await createFinishedStockItems({
        StockModel: SheetStock,
        stockDocuments: buildSheetStockDocuments({ sheets, batch, createdBy }),
        session,
      });

      return {
        batch,
        consumption,
        sheetStocks,
      };
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(409, 'Sheet production contains a duplicate unique value.');
    }

    throw error;
  }
}

export async function updateSheetProductionBatch({ batchId, payload, updatedBy }) {
  assertPositiveQuantity(payload.quantityUsed, 'Quantity used must be greater than 0.');
  assertSheetPayload(payload.sheets, { requireItemNumber: false });

  try {
    return await runProductionTransaction(async (session) => {
      const existingBatch = await findSheetProductionBatchOrThrow(batchId, session);
      const previousRawMaterialStock = await findRawMaterialStockOrThrow(
        existingBatch.rawMaterialStockId,
        session,
      );

      await restoreRawMaterialStock({
        rawMaterialStock: previousRawMaterialStock,
        quantity: existingBatch.quantityUsed,
        session,
      });
      await removeFinishedStockItems({
        StockModel: SheetStock,
        productionBatchId: existingBatch._id,
        session,
      });
      await RawMaterialConsumption.deleteMany(
        { sheetProductionBatchId: existingBatch._id },
        { session },
      );

      const rawMaterialStock =
        String(previousRawMaterialStock._id) === String(payload.rawMaterialStockId)
          ? previousRawMaterialStock
          : await findRawMaterialStockOrThrow(payload.rawMaterialStockId, session);
      const sheets = await assignSheetItemNumbers(payload.sheets, session);
      const itemNumbers = sheets.map((sheet) => sheet.itemNumber);

      assertSheetPayload(sheets);
      assertUniqueItemNumbers(itemNumbers);
      await assertItemNumbersAvailable(itemNumbers, session);

      existingBatch.rawMaterialItem = rawMaterialStock.itemName;
      existingBatch.rawMaterialStockId = rawMaterialStock._id;
      existingBatch.quantityUsed = payload.quantityUsed;
      existingBatch.dateTime = payload.dateTime;
      existingBatch.remarks = payload.remarks;
      existingBatch.sheets = sheets;
      existingBatch.updatedBy = updatedBy;
      await existingBatch.save({ session });

      const consumption = await createRawMaterialConsumption({
        consumptionDocument: {
          rawMaterialItem: rawMaterialStock.itemName,
          rawMaterialStockId: rawMaterialStock._id,
          sheetProductionBatchId: existingBatch._id,
          quantityUsed: payload.quantityUsed,
          dateTime: payload.dateTime,
          remarks: payload.remarks,
          createdBy: updatedBy,
        },
        session,
      });

      await deductRawMaterialStock({
        rawMaterialStock,
        quantityUsed: payload.quantityUsed,
        session,
      });

      const sheetStocks = await createFinishedStockItems({
        StockModel: SheetStock,
        stockDocuments: buildSheetStockDocuments({
          sheets,
          batch: existingBatch,
          createdBy: existingBatch.createdBy,
        }),
        session,
      });

      return {
        batch: existingBatch,
        consumption,
        sheetStocks,
      };
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(409, 'Sheet production contains a duplicate unique value.');
    }

    throw error;
  }
}

export async function deleteSheetProductionBatch({ batchId }) {
  return runProductionTransaction(async (session) => {
    const existingBatch = await findSheetProductionBatchOrThrow(batchId, session);
    const rawMaterialStock = await findRawMaterialStockOrThrow(
      existingBatch.rawMaterialStockId,
      session,
    );

    await restoreRawMaterialStock({
      rawMaterialStock,
      quantity: existingBatch.quantityUsed,
      session,
    });
    await RawMaterialConsumption.deleteMany(
      { sheetProductionBatchId: existingBatch._id },
      { session },
    );
    await removeFinishedStockItems({
      StockModel: SheetStock,
      productionBatchId: existingBatch._id,
      session,
    });
    await SheetProductionBatch.deleteOne({ _id: existingBatch._id }, { session });

    return {
      batch: existingBatch,
    };
  });
}
