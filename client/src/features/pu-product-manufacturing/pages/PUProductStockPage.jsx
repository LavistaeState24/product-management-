import { PackageSearch, Warehouse } from 'lucide-react';
import FinishedStockPage from '@/features/production/components/FinishedStockPage';
import {
  fetchPUProductStock,
  searchPUProductStock,
} from '@/features/pu-product-manufacturing/services/puProductManufacturingService';

const puProductStockConfig = {
  moduleLabel: 'Module 5',
  title: 'PU Product Stock',
  description: 'Track finished PU products by item number, product, size, colour, selling unit, and manufacturing batch.',
  inventoryTitle: 'Finished PU Product Inventory',
  itemCountLabel: 'PU product stock item',
  searchPlaceholder: 'Search item number, product, size, colour, selling unit',
  itemFilterPlaceholder: 'Product name',
  itemColumnTitle: 'Product Name',
  itemNameKey: 'productName',
  metricKey: 'sellingUnit',
  metricParam: 'sellingUnit',
  metricColumnTitle: 'Selling Unit',
  metricFilterPlaceholder: 'Selling unit',
  dateKey: 'productionDate',
  dateColumnTitle: 'Manufacturing Date',
  batchKey: 'manufacturingBatchId',
  batchColumnTitle: 'Batch Number',
  headerIcon: Warehouse,
  emptyIcon: PackageSearch,
  loadingText: 'Loading PU product stock...',
  loadErrorTitle: 'Unable to load PU product stock',
  emptyFilteredTitle: 'No PU products match these filters',
  emptyFilteredDescription: 'Try a broader search or clear the active filters.',
  emptyTitle: 'No PU product stock yet',
  emptyDescription: 'Finished PU products appear here after manufacturing is completed.',
  fetchStock: (params) => (params?.search ? searchPUProductStock(params) : fetchPUProductStock(params)),
  getItemName: (item) => item.productName || '',
  getMetricValue: (item) => item.sellingUnit || '',
  formatMetric: (value) => value || 'Not available',
  getItemLink: (item) => `/pu-product-stock/${item.id}`,
  sortOptions: [
    { value: 'itemNumber:asc', label: 'Item Number A-Z', getValue: (item) => item.itemNumber },
    { value: 'itemNumber:desc', label: 'Item Number Z-A', getValue: (item) => item.itemNumber },
    { value: 'productName:asc', label: 'Product A-Z', getValue: (item) => item.productName },
    { value: 'productName:desc', label: 'Product Z-A', getValue: (item) => item.productName },
    { value: 'size:asc', label: 'Size A-Z', getValue: (item) => item.size },
    { value: 'colour:asc', label: 'Colour A-Z', getValue: (item) => item.colour },
    { value: 'sellingUnit:asc', label: 'Selling Unit A-Z', getValue: (item) => item.sellingUnit },
    { value: 'quantity:desc', label: 'Quantity High-Low', getValue: (item) => Number(item.quantity || 0) },
    { value: 'quantity:asc', label: 'Quantity Low-High', getValue: (item) => Number(item.quantity || 0) },
    {
      value: 'productionDate:desc',
      label: 'Newest First',
      getValue: (item) => new Date(item.productionDate || 0),
    },
    {
      value: 'productionDate:asc',
      label: 'Oldest First',
      getValue: (item) => new Date(item.productionDate || 0),
    },
  ],
};

function PUProductStockPage() {
  return <FinishedStockPage config={puProductStockConfig} />;
}

export default PUProductStockPage;
