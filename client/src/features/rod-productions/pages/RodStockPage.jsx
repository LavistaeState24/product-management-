import { PackageSearch, Warehouse } from 'lucide-react';
import FinishedStockPage from '@/features/production/components/FinishedStockPage';
import { fetchRodStocks } from '@/features/rod-productions/services/rodProductionService';

const rodStockConfig = {
  moduleLabel: 'Module 2',
  title: 'Rod Stock',
  description: 'Track finished rods by item number, dimensions, colour, weight, and production batch.',
  inventoryTitle: 'Finished Rod Inventory',
  itemCountLabel: 'rod stock item',
  searchPlaceholder: 'Search item number, item, size, colour',
  itemFilterPlaceholder: 'Item',
  itemColumnTitle: 'Item',
  itemNameKey: 'item',
  metricKey: 'weightKg',
  metricParam: 'weight',
  metricColumnTitle: 'Weight (Kg)',
  metricFilterPlaceholder: 'Weight',
  headerIcon: Warehouse,
  emptyIcon: PackageSearch,
  loadingText: 'Loading rod stock...',
  loadErrorTitle: 'Unable to load rod stock',
  emptyFilteredTitle: 'No rods match these filters',
  emptyFilteredDescription: 'Try a broader search or clear the active filters.',
  emptyTitle: 'No rod stock yet',
  emptyDescription: 'Finished rods appear here after rod production is completed.',
  fetchStock: fetchRodStocks,
  getItemName: (item) => item.item || '',
  getMetricValue: (item) => item.weightKg,
};

function RodStockPage() {
  return <FinishedStockPage config={rodStockConfig} />;
}

export default RodStockPage;
