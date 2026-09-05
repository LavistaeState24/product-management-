import RawMaterialStock from '../models/RawMaterialStock.js';
import PuChemicalStock from '../models/PuChemicalStock.js';

function formatStockItem(stock) {
  return {
    id: stock._id,
    itemName: stock.itemName,
    availableQuantity: stock.quantity,
    unit: stock.unit,
    category: stock.category || null,
    updatedAt: stock.updatedAt,
  };
}

export async function listStocks(req, res) {
  const [rawMaterials, puChemicals] = await Promise.all([
    RawMaterialStock.find({}).sort({ itemName: 1, unit: 1 }).lean(),
    PuChemicalStock.find({}).sort({ itemName: 1, unit: 1 }).lean(),
  ]);

  return res.status(200).json({
    rawMaterials: rawMaterials.map(formatStockItem),
    puChemicals: puChemicals.map(formatStockItem),
  });
}
