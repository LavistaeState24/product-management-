import { PackageSearch, Warehouse } from 'lucide-react';
import FinishedStockPage from '@/features/production/components/FinishedStockPage';
import {
  fetchSheetStocks,
  searchSheetStocks,
} from '@/features/sheet-productions/services/sheetProductionService';

const sheetStockConfig = {
  moduleLabel: 'Module 2',
  title: 'Sheet Stock',
  description: 'Track finished sheets by item number, item name, size, colour, weight, and production batch.',
  inventoryTitle: 'Finished Sheet Inventory',
  itemCountLabel: 'sheet stock item',
  searchPlaceholder: 'Search item number, item name, size, colour, weight',
  itemFilterPlaceholder: 'Item name',
  itemColumnTitle: 'Item Name',
  itemNameKey: 'itemName',
  metricKey: 'weight',
  metricParam: 'weight',
  metricColumnTitle: 'Weight (Kg)',
  metricFilterPlaceholder: 'Weight',
  headerIcon: Warehouse,
  emptyIcon: PackageSearch,
  loadingText: 'Loading sheet stock...',
  loadErrorTitle: 'Unable to load sheet stock',
  emptyFilteredTitle: 'No sheets match these filters',
  emptyFilteredDescription: 'Try a broader search or clear the active filters.',
  emptyTitle: 'No sheet stock yet',
  emptyDescription: 'Finished sheets appear here after sheet production is completed.',
  fetchStock: (params) => (params?.search ? searchSheetStocks(params) : fetchSheetStocks(params)),
  getItemName: (item) => item.itemName || '',
  getMetricValue: (item) => item.weight,
  getItemLink: (item) => `/sheet-stock/${item.id}`,
};

function SheetStockPage() {
  return <FinishedStockPage config={sheetStockConfig} />;
}

export default SheetStockPage;
