import SheetProductManufacturingBatch from '../models/SheetProductManufacturingBatch.js';
import SheetProductStock from '../models/SheetProductStock.js';
import SheetStock from '../models/SheetStock.js';
import { createHttpError } from '../utils/httpError.js';
import {
  assertFinishedItemNumbersAvailable,
  assertPositiveQuantity,
  createFinishedStockItems,
  createProductionBatch,
  deductStock,
  findStockByIdOrThrow,
  generateProductionNumber,
  runProductionTransaction,
} from './productionInventoryService.js';

const SHEET_PRODUCT_ITEM_NUMBER_PREFIX = 'SHP';

async function generateBatchNumber(dateTime, session) {
  return generateProductionNumber({
    Model: SheetProductManufacturingBatch,
    dateTime,
    prefix: 'SPM',
    session,
  });
}

function formatSheetProductItemNumber(sequence) {
  return `${SHEET_PRODUCT_ITEM_NUMBER_PREFIX}-${String(sequence).padStart(6, '0')}`;
}

function parseSheetProductItemNumberSequence(itemNumber = '') {
  const match = itemNumber.match(/^SHP-(\d{6})$/);
  return match ? Number(match[1]) : 0;
}

async function generateSheetProductItemNumber(session) {
  const latestStock = await SheetProductStock.findOne({
    itemNumber: /^SHP-\d{6}$/,
  })
    .sort({ itemNumber: -1 })
    .session(session)
    .lean();
  const nextSequence = parseSheetProductItemNumberSequence(latestStock?.itemNumber) + 1;

  return formatSheetProductItemNumber(nextSequence);
}

function assertManufacturingPayload(payload) {
  assertPositiveQuantity(payload.quantityUsed, 'Sheet quantity used must be greater than 0.');

  if (!payload.productName) {
    throw createHttpError(422, 'Product name is required.');
  }

  if (!payload.size) {
    throw createHttpError(422, 'Size is required.');
  }

  if (!payload.colour) {
    throw createHttpError(422, 'Colour is required.');
  }

  if (!['Per PCS', 'Per Kg'].includes(payload.sellingUnit)) {
    throw createHttpError(422, 'Selling unit must be Per PCS or Per Kg.');
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity <= 0) {
    throw createHttpError(422, 'Quantity must be greater than 0.');
  }
}

async function assertItemNumberAvailable(itemNumber, session) {
  await assertFinishedItemNumbersAvailable({
    StockModel: SheetProductStock,
    itemNumbers: [itemNumber],
    session,
    buildMessage: (existingItemNumber) =>
      `Sheet product item number "${existingItemNumber}" already exists.`,
  });
}

async function findSheetStockOrThrow({ stockId, session }) {
  return findStockByIdOrThrow({
    StockModel: SheetStock,
    stockId,
    session,
    notFoundMessage: 'Sheet stock not found.',
  });
}

function buildSheetProductStockDocument({ payload, batch, createdBy }) {
  return {
    itemNumber: payload.itemNumber,
    productName: payload.productName,
    size: payload.size,
    colour: payload.colour,
    drawingNumber: payload.drawingNumber || '',
    photo: payload.photo || '',
    sellingUnit: payload.sellingUnit,
    quantity: payload.quantity,
    productionDate: payload.dateTime,
    manufacturingBatchId: batch._id,
    createdBy,
  };
}

export function formatSheetProductStock(stock) {
  return {
    id: stock._id,
    itemNumber: stock.itemNumber,
    productName: stock.productName,
    size: stock.size,
    colour: stock.colour,
    drawingNumber: stock.drawingNumber || '',
    photo: stock.photo || '',
    sellingUnit: stock.sellingUnit,
    quantity: stock.quantity,
    productionDate: stock.productionDate,
    manufacturingBatchId: stock.manufacturingBatchId,
    createdBy: stock.createdBy,
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
  };
}

export function formatSheetProductManufacturingBatch(batch) {
  return {
    id: batch._id,
    sheetItem: batch.sheetItem,
    sheetStockId: batch.sheetStockId,
    quantityUsed: batch.quantityUsed,
    productName: batch.productName,
    size: batch.size,
    colour: batch.colour,
    sellingUnit: batch.sellingUnit,
    quantity: batch.quantity,
    itemNumber: batch.itemNumber,
    dateTime: batch.dateTime,
    remarks: batch.remarks,
    batchNumber: batch.batchNumber,
    batchId: batch.batchId,
    createdBy: batch.createdBy,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

export async function createSheetProductManufacturingBatch({ payload, createdBy }) {
  assertManufacturingPayload(payload);

  try {
    return await runProductionTransaction(async (session) => {
      const sheetStock = await findSheetStockOrThrow({
        stockId: payload.sheetStockId,
        session,
      });

      const itemNumber = payload.itemNumber || (await generateSheetProductItemNumber(session));
      await assertItemNumberAvailable(itemNumber, session);

      const batchNumber = await generateBatchNumber(payload.dateTime, session);
      const batchPayload = {
        ...payload,
        itemNumber,
      };
      const batch = await createProductionBatch({
        BatchModel: SheetProductManufacturingBatch,
        batchDocument: {
          sheetItem: sheetStock.itemName,
          sheetStockId: sheetStock._id,
          quantityUsed: payload.quantityUsed,
          productName: payload.productName,
          size: payload.size,
          colour: payload.colour,
          sellingUnit: payload.sellingUnit,
          quantity: payload.quantity,
          itemNumber,
          dateTime: payload.dateTime,
          remarks: payload.remarks,
          batchNumber,
          batchId: batchNumber,
          createdBy,
        },
        session,
      });

      await deductStock({
        stock: sheetStock,
        quantityUsed: payload.quantityUsed,
        session,
        itemLabel: 'sheet stock',
      });

      const [sheetProductStock] = await createFinishedStockItems({
        StockModel: SheetProductStock,
        stockDocuments: [
          buildSheetProductStockDocument({
            payload: batchPayload,
            batch,
            createdBy,
          }),
        ],
        session,
      });

      return {
        batch,
        sheetProductStock,
      };
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(
        409,
        'Sheet product manufacturing contains a duplicate unique value.',
      );
    }

    throw error;
  }
}
