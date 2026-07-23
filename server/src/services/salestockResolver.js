import Product from '../models/Product.js';
import RodStock from '../models/RodStock.js';
import SheetStock from '../models/SheetStock.js';
import PUProductStock from '../models/PUProductStock.js';


const stockModels = {
  rod: RodStock,
  sheet: SheetStock,
  'pu-product': PUProductStock,
  'legacy-product': Product,
};

function getCurrentStock(stockType, stockDocument) {
  if (!stockDocument) {
    return null;
  }

  if (stockType === 'legacy-product') {
    return Number(stockDocument.currentStock ?? 0);
  }

  return Number(stockDocument.quantity ?? 0);
}

export async function resolveSaleItemStock(item) {
  const stockType = item.stockType;

  const stockRef =
    item.stockRef?._id ||
    item.stockRef?.id ||
    item.stockRef;

  const StockModel = stockModels[stockType];

  if (!StockModel || !stockRef) {
    return {
      currentStock: null,
    };
  }

  const stockDocument = await StockModel.findById(stockRef)
    .lean();

  if (!stockDocument) {
    return {
      currentStock: null,
    };
  }

  return {
    currentStock: getCurrentStock(
      stockType,
      stockDocument,
    ),

    itemNumber:
      stockDocument.itemNumber || '',

    productName:
      stockDocument.productName ||
      stockDocument.item ||
      stockDocument.name ||
      stockDocument.itemName ||
      '',

    size: stockDocument.size || '',

    colour:
      stockDocument.colour ||
      stockDocument.color ||
      '',

    weight:
      stockDocument.weight ??
      stockDocument.weightKg ??
      null,

    sellingUnit:
      stockDocument.sellingUnit || '',
  };
}
