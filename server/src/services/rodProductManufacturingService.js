import RodProductManufacturingBatch from '../models/RodProductManufacturingBatch.js';
import RodProductStock from '../models/RodProductStock.js';
import RodStock from '../models/RodStock.js';
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

const ROD_PRODUCT_ITEM_NUMBER_PREFIX = 'RDP';

async function generateBatchNumber(dateTime, session) {
  return generateProductionNumber({
    Model: RodProductManufacturingBatch,
    dateTime,
    prefix: 'RPM',
    session,
  });
}

function formatRodProductItemNumber(sequence) {
  return `${ROD_PRODUCT_ITEM_NUMBER_PREFIX}-${String(sequence).padStart(6, '0')}`;
}

function parseRodProductItemNumberSequence(itemNumber = '') {
  const match = itemNumber.match(/^RDP-(\d{6})$/);
  return match ? Number(match[1]) : 0;
}

async function generateRodProductItemNumber(session) {
  const latestStock = await RodProductStock.findOne({
    itemNumber: /^RDP-\d{6}$/,
  })
    .sort({ itemNumber: -1 })
    .session(session)
    .lean();
  const nextSequence = parseRodProductItemNumberSequence(latestStock?.itemNumber) + 1;

  return formatRodProductItemNumber(nextSequence);
}

function assertManufacturingPayload(payload) {
  assertPositiveQuantity(payload.quantityUsed, 'Rod quantity used must be greater than 0.');

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
    StockModel: RodProductStock,
    itemNumbers: [itemNumber],
    session,
    buildMessage: (existingItemNumber) =>
      `Rod product item number "${existingItemNumber}" already exists.`,
  });
}

async function findRodStockOrThrow({ stockId, session }) {
  return findStockByIdOrThrow({
    StockModel: RodStock,
    stockId,
    session,
    notFoundMessage: 'Rod stock not found.',
  });
}

function buildRodProductStockDocument({ payload, batch, createdBy }) {
  return {
    itemNumber: payload.itemNumber,
    productName: payload.productName,
    size: payload.size,
    colour: payload.colour,
    sellingUnit: payload.sellingUnit,
    quantity: payload.quantity,
    productionDate: payload.dateTime,
    manufacturingBatchId: batch._id,
    createdBy,
  };
}

export function formatRodProductStock(stock) {
  return {
    id: stock._id,
    itemNumber: stock.itemNumber,
    productName: stock.productName,
    size: stock.size,
    colour: stock.colour,
    sellingUnit: stock.sellingUnit,
    quantity: stock.quantity,
    productionDate: stock.productionDate,
    manufacturingBatchId: stock.manufacturingBatchId,
    createdBy: stock.createdBy,
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
  };
}

export function formatRodProductManufacturingBatch(batch) {
  return {
    id: batch._id,
    rodItem: batch.rodItem,
    rodStockId: batch.rodStockId,
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

export async function createRodProductManufacturingBatch({ payload, createdBy }) {
  assertManufacturingPayload(payload);

  try {
    return await runProductionTransaction(async (session) => {
      const rodStock = await findRodStockOrThrow({
        stockId: payload.rodStockId,
        session,
      });

      const itemNumber = payload.itemNumber || (await generateRodProductItemNumber(session));
      await assertItemNumberAvailable(itemNumber, session);

      const batchNumber = await generateBatchNumber(payload.dateTime, session);
      const batchPayload = {
        ...payload,
        itemNumber,
      };
      const batch = await createProductionBatch({
        BatchModel: RodProductManufacturingBatch,
        batchDocument: {
          rodItem: rodStock.item,
          rodStockId: rodStock._id,
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
        stock: rodStock,
        quantityUsed: payload.quantityUsed,
        session,
        itemLabel: 'rod stock',
      });

      const [rodProductStock] = await createFinishedStockItems({
        StockModel: RodProductStock,
        stockDocuments: [
          buildRodProductStockDocument({
            payload: batchPayload,
            batch,
            createdBy,
          }),
        ],
        session,
      });

      return {
        batch,
        rodProductStock,
      };
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(409, 'Rod product manufacturing contains a duplicate unique value.');
    }

    throw error;
  }
}
