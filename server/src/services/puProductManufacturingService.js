import PUProductManufacturingBatch from '../models/PUProductManufacturingBatch.js';
import PUProductStock from '../models/PUProductStock.js';
import PuChemicalStock from '../models/PuChemicalStock.js';
import { createHttpError } from '../utils/httpError.js';
import {
  assertFinishedItemNumbersAvailable,
  assertPositiveQuantity,
  createFinishedStockItems,
  createProductionBatch,
  deductStock,
  findStockByIdOrThrow,
  generateProductionNumber,
  restoreStock,
  runProductionTransaction,
} from './productionInventoryService.js';

const PU_PRODUCT_ITEM_NUMBER_PREFIX = 'PUP';

async function generateBatchNumber(dateTime, session) {
  return generateProductionNumber({
    Model: PUProductManufacturingBatch,
    dateTime,
    prefix: 'PPM',
    session,
  });
}

function formatPUProductItemNumber(sequence) {
  return `${PU_PRODUCT_ITEM_NUMBER_PREFIX}-${String(sequence).padStart(6, '0')}`;
}

function parsePUProductItemNumberSequence(itemNumber = '') {
  const match = itemNumber.match(/^PUP-(\d{6})$/);
  return match ? Number(match[1]) : 0;
}

async function generatePUProductItemNumber(session) {
  const latestStock = await PUProductStock.findOne({
    itemNumber: /^PUP-\d{6}$/,
  })
    .sort({ itemNumber: -1 })
    .session(session)
    .lean();
  const nextSequence = parsePUProductItemNumberSequence(latestStock?.itemNumber) + 1;

  return formatPUProductItemNumber(nextSequence);
}

function assertManufacturingPayload(payload) {
  assertPositiveQuantity(payload.chemicalQuantityKg, 'Chemical quantity must be greater than 0.');
  assertPositiveQuantity(payload.mocaQuantityKg, 'MOCA quantity must be greater than 0.');

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
    StockModel: PUProductStock,
    itemNumbers: [itemNumber],
    session,
    buildMessage: (existingItemNumber) =>
      `PU product item number "${existingItemNumber}" already exists.`,
  });
}

async function findPUProductManufacturingBatchOrThrow(batchId, session) {
  const batch = await PUProductManufacturingBatch.findById(batchId).session(session);

  if (!batch) {
    throw createHttpError(404, 'PU product manufacturing batch not found.');
  }

  return batch;
}

async function findPuChemicalStockOrThrow({ stockId, session, notFoundMessage }) {
  return findStockByIdOrThrow({
    StockModel: PuChemicalStock,
    stockId,
    session,
    notFoundMessage,
  });
}

function buildPUProductStockDocument({ payload, batch, createdBy }) {
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

export function formatPUProductStock(stock) {
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

export function formatPUProductManufacturingBatch(batch) {
  return {
    id: batch._id,
    puChemicalItem: batch.puChemicalItem,
    puChemicalStockId: batch.puChemicalStockId,
    chemicalQuantityKg: batch.chemicalQuantityKg,
    mocaItem: batch.mocaItem,
    mocaStockId: batch.mocaStockId,
    mocaQuantityKg: batch.mocaQuantityKg,
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

export async function createPUProductManufacturingBatch({ payload, createdBy }) {
  assertManufacturingPayload(payload);

  try {
    return await runProductionTransaction(async (session) => {
      const puChemicalStock = await findPuChemicalStockOrThrow({
        stockId: payload.puChemicalStockId,
        session,
        notFoundMessage: 'PU chemical stock not found.',
      });
      const mocaStock =
        String(payload.mocaStockId) === String(payload.puChemicalStockId)
          ? puChemicalStock
          : await findPuChemicalStockOrThrow({
              stockId: payload.mocaStockId,
              session,
              notFoundMessage: 'MOCA stock not found.',
            });

      const itemNumber = payload.itemNumber || (await generatePUProductItemNumber(session));
      await assertItemNumberAvailable(itemNumber, session);

      const batchNumber = await generateBatchNumber(payload.dateTime, session);
      const batchPayload = {
        ...payload,
        itemNumber,
      };
      const batch = await createProductionBatch({
        BatchModel: PUProductManufacturingBatch,
        batchDocument: {
          puChemicalItem: puChemicalStock.itemName,
          puChemicalStockId: puChemicalStock._id,
          chemicalQuantityKg: payload.chemicalQuantityKg,
          mocaItem: mocaStock.itemName,
          mocaStockId: mocaStock._id,
          mocaQuantityKg: payload.mocaQuantityKg,
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
        stock: puChemicalStock,
        quantityUsed: payload.chemicalQuantityKg,
        session,
        itemLabel: 'PU chemical stock',
      });
      await deductStock({
        stock: mocaStock,
        quantityUsed: payload.mocaQuantityKg,
        session,
        itemLabel: 'MOCA stock',
      });

      const [puProductStock] = await createFinishedStockItems({
        StockModel: PUProductStock,
        stockDocuments: [
          buildPUProductStockDocument({
            payload: batchPayload,
            batch,
            createdBy,
          }),
        ],
        session,
      });

      return {
        batch,
        puProductStock,
      };
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(409, 'PU product manufacturing contains a duplicate unique value.');
    }

    throw error;
  }
}

export async function updatePUProductManufacturingBatch({ batchId, payload }) {
  assertManufacturingPayload(payload);

  try {
    return await runProductionTransaction(async (session) => {
      const existingBatch = await findPUProductManufacturingBatchOrThrow(batchId, session);
      const previousPuChemicalStock = await findPuChemicalStockOrThrow({
        stockId: existingBatch.puChemicalStockId,
        session,
        notFoundMessage: 'Previous PU chemical stock not found.',
      });
      const previousMocaStock =
        String(existingBatch.mocaStockId) === String(existingBatch.puChemicalStockId)
          ? previousPuChemicalStock
          : await findPuChemicalStockOrThrow({
              stockId: existingBatch.mocaStockId,
              session,
              notFoundMessage: 'Previous MOCA stock not found.',
            });

      await restoreStock({
        stock: previousPuChemicalStock,
        quantity: existingBatch.chemicalQuantityKg,
        session,
      });
      await restoreStock({
        stock: previousMocaStock,
        quantity: existingBatch.mocaQuantityKg,
        session,
      });
      await PUProductStock.deleteMany(
        { manufacturingBatchId: existingBatch._id },
        { session },
      );

      const puChemicalStock =
        String(previousPuChemicalStock._id) === String(payload.puChemicalStockId)
          ? previousPuChemicalStock
          : await findPuChemicalStockOrThrow({
              stockId: payload.puChemicalStockId,
              session,
              notFoundMessage: 'PU chemical stock not found.',
            });
      const mocaStock =
        String(puChemicalStock._id) === String(payload.mocaStockId)
          ? puChemicalStock
          : String(previousMocaStock._id) === String(payload.mocaStockId)
            ? previousMocaStock
            : await findPuChemicalStockOrThrow({
                stockId: payload.mocaStockId,
                session,
                notFoundMessage: 'MOCA stock not found.',
              });
      const itemNumber = payload.itemNumber || existingBatch.itemNumber;

      await assertItemNumberAvailable(itemNumber, session);

      existingBatch.puChemicalItem = puChemicalStock.itemName;
      existingBatch.puChemicalStockId = puChemicalStock._id;
      existingBatch.chemicalQuantityKg = payload.chemicalQuantityKg;
      existingBatch.mocaItem = mocaStock.itemName;
      existingBatch.mocaStockId = mocaStock._id;
      existingBatch.mocaQuantityKg = payload.mocaQuantityKg;
      existingBatch.productName = payload.productName;
      existingBatch.size = payload.size;
      existingBatch.colour = payload.colour;
      existingBatch.sellingUnit = payload.sellingUnit;
      existingBatch.quantity = payload.quantity;
      existingBatch.itemNumber = itemNumber;
      existingBatch.dateTime = payload.dateTime;
      existingBatch.remarks = payload.remarks;
      await existingBatch.save({ session });

      await deductStock({
        stock: puChemicalStock,
        quantityUsed: payload.chemicalQuantityKg,
        session,
        itemLabel: 'PU chemical stock',
      });
      await deductStock({
        stock: mocaStock,
        quantityUsed: payload.mocaQuantityKg,
        session,
        itemLabel: 'MOCA stock',
      });

      const [puProductStock] = await createFinishedStockItems({
        StockModel: PUProductStock,
        stockDocuments: [
          buildPUProductStockDocument({
            payload: {
              ...payload,
              itemNumber,
            },
            batch: existingBatch,
            createdBy: existingBatch.createdBy,
          }),
        ],
        session,
      });

      return {
        batch: existingBatch,
        puProductStock,
      };
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(409, 'PU product manufacturing contains a duplicate unique value.');
    }

    throw error;
  }
}

export async function deletePUProductManufacturingBatch({ batchId }) {
  return runProductionTransaction(async (session) => {
    const existingBatch = await findPUProductManufacturingBatchOrThrow(batchId, session);
    const puChemicalStock = await findPuChemicalStockOrThrow({
      stockId: existingBatch.puChemicalStockId,
      session,
      notFoundMessage: 'PU chemical stock not found.',
    });
    const mocaStock =
      String(existingBatch.mocaStockId) === String(existingBatch.puChemicalStockId)
        ? puChemicalStock
        : await findPuChemicalStockOrThrow({
            stockId: existingBatch.mocaStockId,
            session,
            notFoundMessage: 'MOCA stock not found.',
          });

    await restoreStock({
      stock: puChemicalStock,
      quantity: existingBatch.chemicalQuantityKg,
      session,
    });
    await restoreStock({
      stock: mocaStock,
      quantity: existingBatch.mocaQuantityKg,
      session,
    });
    await PUProductStock.deleteMany(
      { manufacturingBatchId: existingBatch._id },
      { session },
    );
    await PUProductManufacturingBatch.deleteOne({ _id: existingBatch._id }, { session });

    return {
      batch: existingBatch,
    };
  });
}
