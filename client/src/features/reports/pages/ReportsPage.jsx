import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer, SearchX } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { fetchReport } from '@/features/reports/services/reportService';
import { formatCurrency, formatDate } from '@/features/sales/utils/saleHelpers';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

const reportTabs = [
  { key: 'purchases', label: 'Purchase', endpoint: 'purchases' },
  { key: 'sales', label: 'Sales', endpoint: 'sales' },
  { key: 'production', label: 'Production', endpoint: 'production' },
  { key: 'stock', label: 'Stock', endpoint: 'stock' },
  { key: 'low-stock', label: 'Low Stock', endpoint: 'low-stock' },
  { key: 'customer-outstanding', label: 'Customer Outstanding', endpoint: 'customer-outstanding' },
  { key: 'supplier-outstanding', label: 'Supplier Outstanding', endpoint: 'supplier-outstanding' },
  { key: 'profit-loss', label: 'Profit & Loss', endpoint: 'profit-loss' },
  { key: 'inventory-value', label: 'Inventory Value', endpoint: 'inventory-value' },
  { key: 'gst', label: 'GST', endpoint: 'gst' },
];

const paymentTypeOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Credit', label: 'Credit' },
  { value: 'Advance', label: 'Advance' },
];

const salePaymentTypeOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Credit', label: 'Credit' },
];

const purchaseStatusOptions = [
  { value: 'Paid', label: 'Paid' },
  { value: 'Partially Paid', label: 'Partially Paid' },
  { value: 'Pending', label: 'Pending' },
];

const invoiceStatusOptions = [
  { value: 'Paid', label: 'Paid' },
  { value: 'Partially Paid', label: 'Partially Paid' },
  { value: 'Unpaid', label: 'Unpaid' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const purchaseTypeOptions = [
  { value: 'Raw Material', label: 'Raw Material' },
  { value: 'PU Chemical', label: 'PU Chemical' },
];

const productionTypeOptions = [
  { value: 'rod', label: 'Rod' },
  { value: 'sheet', label: 'Sheet' },
  { value: 'pu-product', label: 'PU Product' },
];

const stockCategoryOptions = [
  { value: 'raw-material', label: 'Raw Material' },
  { value: 'pu-chemical', label: 'PU Chemical' },
  { value: 'rod', label: 'Rod' },
  { value: 'sheet', label: 'Sheet' },
  { value: 'pu-product', label: 'PU Product' },
  { value: 'legacy-product', label: 'Legacy Product' },
];

const outstandingStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'settled', label: 'Settled' },
];

const gstCategoryOptions = [
  { value: 'purchase', label: 'Purchase GST' },
  { value: 'sale', label: 'Sales GST' },
];

const gstTypeOptions = [
  { value: 'None', label: 'None' },
  { value: 'CGST_SGST', label: 'CGST + SGST' },
  { value: 'IGST', label: 'IGST' },
];

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  return value;
}

function getStatusVariant(status) {
  if (['Paid', 'settled', 'valued'].includes(status)) {
    return 'success';
  }

  if (['Partially Paid', 'pending', 'unavailable'].includes(status)) {
    return 'warning';
  }

  if (['Unpaid', 'Cancelled'].includes(status)) {
    return 'danger';
  }

  return 'neutral';
}

function moneyCell(value) {
  return formatCurrency(value);
}

function dateCell(value) {
  return formatDate(value);
}

function badgeCell(value) {
  return <Badge variant={getStatusVariant(value)}>{value || '-'}</Badge>;
}

function textCell(value) {
  return value || '-';
}

function quantityCell(value, row) {
  return `${formatNumber(value)} ${row.unit || ''}`.trim();
}

const reports = {
  purchases: {
    title: 'Purchase Report',
    description: 'Purchase totals, GST, payment status and supplier dues from purchase records.',
    searchPlaceholder: 'Search supplier, item, GST, remarks',
    filters: [
      { key: 'supplier', type: 'text', label: 'Supplier' },
      { key: 'purchaseType', type: 'select', label: 'Purchase Type', options: purchaseTypeOptions },
      { key: 'paymentType', type: 'select', label: 'Payment Type', options: paymentTypeOptions },
      { key: 'status', type: 'select', label: 'Status', options: purchaseStatusOptions },
      { key: 'dateFrom', type: 'date', label: 'From' },
      { key: 'dateTo', type: 'date', label: 'To' },
    ],
    kpis: [
      { key: 'totalAmount', label: 'Total Purchases', format: moneyCell },
      { key: 'paidAmount', label: 'Paid', format: moneyCell },
      { key: 'dueAmount', label: 'Due', format: moneyCell },
      { key: 'gstAmount', label: 'GST', format: moneyCell },
    ],
    columns: [
      { key: 'purchaseDate', title: 'Date', render: dateCell },
      { key: 'supplierName', title: 'Supplier', render: textCell },
      { key: 'purchaseType', title: 'Type', render: badgeCell },
      { key: 'itemName', title: 'Item', render: textCell },
      { key: 'quantity', title: 'Qty', render: quantityCell },
      { key: 'totalAmount', title: 'Total', render: moneyCell },
      { key: 'paidAmount', title: 'Paid', render: moneyCell },
      { key: 'dueAmount', title: 'Due', render: moneyCell },
    ],
  },
  sales: {
    title: 'Sales Report',
    description: 'Sales invoice totals, GST, payment status and outstanding amounts from backend data.',
    searchPlaceholder: 'Search invoice, customer, product, item number',
    filters: [
      { key: 'customer', type: 'text', label: 'Customer' },
      { key: 'category', type: 'select', label: 'Category', options: productionTypeOptions.concat([{ value: 'legacy-product', label: 'Legacy Product' }]) },
      { key: 'paymentType', type: 'select', label: 'Payment Type', options: salePaymentTypeOptions },
      { key: 'status', type: 'select', label: 'Status', options: invoiceStatusOptions },
      { key: 'dateFrom', type: 'date', label: 'From' },
      { key: 'dateTo', type: 'date', label: 'To' },
    ],
    kpis: [
      { key: 'grandTotal', label: 'Sales Total', format: moneyCell },
      { key: 'paidAmount', label: 'Paid', format: moneyCell },
      { key: 'outstandingAmount', label: 'Outstanding', format: moneyCell },
      { key: 'gstAmount', label: 'GST', format: moneyCell },
    ],
    columns: [
      { key: 'invoiceNumber', title: 'Invoice', render: textCell },
      { key: 'invoiceDate', title: 'Date', render: dateCell },
      { key: 'customerName', title: 'Customer', render: textCell },
      { key: 'productName', title: 'Product', render: textCell },
      { key: 'grandTotal', title: 'Total', render: (value, row) => moneyCell(value ?? row.totalAmount) },
      { key: 'paidAmount', title: 'Paid', render: moneyCell },
      { key: 'outstandingAmount', title: 'Outstanding', render: moneyCell },
      { key: 'invoiceStatus', title: 'Status', render: badgeCell },
    ],
  },
  production: {
    title: 'Production Report',
    description: 'Rod, sheet and PU product production batches with input and output quantities.',
    searchPlaceholder: 'Search batch, item, colour, remarks',
    filters: [
      { key: 'type', type: 'select', label: 'Type', options: productionTypeOptions },
      { key: 'dateFrom', type: 'date', label: 'From' },
      { key: 'dateTo', type: 'date', label: 'To' },
    ],
    kpis: [
      { key: 'count', label: 'Batches', format: formatNumber },
      { key: 'inputQuantity', label: 'Input Qty', format: formatNumber },
      { key: 'outputQuantity', label: 'Output Qty', format: formatNumber },
      { key: 'itemCount', label: 'Items', format: formatNumber },
    ],
    columns: [
      { key: 'dateTime', title: 'Date', render: dateCell },
      { key: 'type', title: 'Type', render: badgeCell },
      { key: 'batchNumber', title: 'Batch', render: textCell },
      { key: 'inputItem', title: 'Input Item', render: textCell },
      { key: 'inputQuantity', title: 'Input Qty', render: formatNumber },
      { key: 'outputQuantity', title: 'Output Qty', render: formatNumber },
      { key: 'remarks', title: 'Remarks', render: textCell },
    ],
  },
  stock: {
    title: 'Stock Report',
    description: 'Current stock across raw material, PU chemical, finished and legacy product stock.',
    searchPlaceholder: 'Search item, number, colour, size',
    filters: [{ key: 'category', type: 'select', label: 'Category', options: stockCategoryOptions }],
    kpis: [
      { key: 'count', label: 'Stock Items', format: formatNumber },
      { key: 'totalQuantity', label: 'Total Qty', format: formatNumber },
    ],
    columns: [
      { key: 'category', title: 'Category', render: badgeCell },
      { key: 'itemNumber', title: 'Item No.', render: textCell },
      { key: 'itemName', title: 'Item', render: textCell },
      { key: 'size', title: 'Size', render: textCell },
      { key: 'colour', title: 'Colour', render: textCell },
      { key: 'quantity', title: 'Quantity', render: quantityCell },
      { key: 'updatedAt', title: 'Updated', render: dateCell },
    ],
  },
  'low-stock': {
    title: 'Low Stock Report',
    description: 'Low and out-of-stock items using the backend threshold filter.',
    searchPlaceholder: 'Search item, number, colour, size',
    filters: [
      { key: 'category', type: 'select', label: 'Category', options: stockCategoryOptions },
      { key: 'threshold', type: 'number', label: 'Threshold' },
    ],
    kpis: [
      { key: 'count', label: 'Alert Items', format: formatNumber },
      { key: 'lowStockCount', label: 'Low Stock', format: formatNumber },
      { key: 'outOfStockCount', label: 'Out of Stock', format: formatNumber },
      { key: 'threshold', label: 'Threshold', format: formatNumber },
    ],
    columns: [
      { key: 'category', title: 'Category', render: badgeCell },
      { key: 'itemNumber', title: 'Item No.', render: textCell },
      { key: 'itemName', title: 'Item', render: textCell },
      { key: 'quantity', title: 'Quantity', render: quantityCell },
      { key: 'updatedAt', title: 'Updated', render: dateCell },
    ],
  },
  'customer-outstanding': {
    title: 'Customer Outstanding',
    description: 'Customer receivables from CustomerReceivable and linked sales invoices.',
    searchPlaceholder: 'Search customer, invoice, status',
    filters: [
      { key: 'customer', type: 'text', label: 'Customer' },
      { key: 'status', type: 'select', label: 'Status', options: outstandingStatusOptions },
      { key: 'dateFrom', type: 'date', label: 'From' },
      { key: 'dateTo', type: 'date', label: 'To' },
    ],
    kpis: [
      { key: 'outstandingAmount', label: 'Outstanding', format: moneyCell },
      { key: 'totalAmount', label: 'Invoice Total', format: moneyCell },
      { key: 'paidAmount', label: 'Paid', format: moneyCell },
      { key: 'count', label: 'Records', format: formatNumber },
    ],
    columns: [
      { key: 'invoiceNumber', title: 'Invoice', render: textCell },
      { key: 'customer', title: 'Customer', render: textCell },
      { key: 'invoiceDate', title: 'Invoice Date', render: dateCell },
      { key: 'dueDate', title: 'Due Date', render: dateCell },
      { key: 'totalAmount', title: 'Total', render: moneyCell },
      { key: 'outstandingAmount', title: 'Outstanding', render: moneyCell },
      { key: 'status', title: 'Status', render: badgeCell },
    ],
  },
  'supplier-outstanding': {
    title: 'Supplier Outstanding',
    description: 'Supplier payables from SupplierPayable and linked purchase records.',
    searchPlaceholder: 'Search supplier, invoice, status',
    filters: [
      { key: 'supplier', type: 'text', label: 'Supplier' },
      { key: 'status', type: 'select', label: 'Status', options: outstandingStatusOptions },
      { key: 'dateFrom', type: 'date', label: 'From' },
      { key: 'dateTo', type: 'date', label: 'To' },
    ],
    kpis: [
      { key: 'outstandingAmount', label: 'Outstanding', format: moneyCell },
      { key: 'totalAmount', label: 'Purchase Total', format: moneyCell },
      { key: 'paidAmount', label: 'Paid', format: moneyCell },
      { key: 'count', label: 'Records', format: formatNumber },
    ],
    columns: [
      { key: 'invoiceNumber', title: 'Invoice', render: textCell },
      { key: 'supplier', title: 'Supplier', render: textCell },
      { key: 'purchaseDate', title: 'Purchase Date', render: dateCell },
      { key: 'dueDate', title: 'Due Date', render: dateCell },
      { key: 'totalAmount', title: 'Total', render: moneyCell },
      { key: 'outstandingAmount', title: 'Outstanding', render: moneyCell },
      { key: 'status', title: 'Status', render: badgeCell },
    ],
  },
  'profit-loss': {
    title: 'Profit & Loss',
    description: 'Financial totals from backend records. Profit remains unavailable where COGS is not stored.',
    searchPlaceholder: 'Search metric or source',
    filters: [
      { key: 'customer', type: 'text', label: 'Customer' },
      { key: 'supplier', type: 'text', label: 'Supplier' },
      { key: 'dateFrom', type: 'date', label: 'From' },
      { key: 'dateTo', type: 'date', label: 'To' },
    ],
    kpis: [
      { key: 'salesRevenueBeforeGst', label: 'Sales Before GST', format: moneyCell },
      { key: 'purchaseCostBeforeGst', label: 'Purchase Cost', format: moneyCell },
      { key: 'netGstPayable', label: 'Net GST', format: moneyCell },
      { key: 'customerReceivables', label: 'Receivables', format: moneyCell },
    ],
    columns: [
      { key: 'section', title: 'Section', render: badgeCell },
      { key: 'metric', title: 'Metric', render: textCell },
      { key: 'amount', title: 'Amount', render: moneyCell },
      { key: 'source', title: 'Source', render: textCell },
    ],
  },
  'inventory-value': {
    title: 'Inventory Value',
    description: 'Inventory valuation only where backend has real purchase cost data.',
    searchPlaceholder: 'Search item, number, category',
    filters: [{ key: 'category', type: 'select', label: 'Category', options: stockCategoryOptions }],
    kpis: [
      { key: 'totalKnownInventoryValue', label: 'Known Value', format: moneyCell },
      { key: 'valuedItemCount', label: 'Valued Items', format: formatNumber },
      { key: 'unavailableItemCount', label: 'Unavailable', format: formatNumber },
      { key: 'count', label: 'Stock Items', format: formatNumber },
    ],
    columns: [
      { key: 'category', title: 'Category', render: badgeCell },
      { key: 'itemName', title: 'Item', render: textCell },
      { key: 'quantity', title: 'Quantity', render: quantityCell },
      { key: 'unitCost', title: 'Unit Cost', render: (value) => (value == null ? '-' : moneyCell(value)) },
      { key: 'inventoryValue', title: 'Value', render: (value) => (value == null ? '-' : moneyCell(value)) },
      { key: 'valuationStatus', title: 'Status', render: badgeCell },
    ],
  },
  gst: {
    title: 'GST Report',
    description: 'Input and output GST from purchase and sales backend totals.',
    searchPlaceholder: 'Search party, reference, GST type',
    filters: [
      { key: 'customer', type: 'text', label: 'Customer' },
      { key: 'supplier', type: 'text', label: 'Supplier' },
      { key: 'category', type: 'select', label: 'Category', options: gstCategoryOptions },
      { key: 'gstType', type: 'select', label: 'GST Type', options: gstTypeOptions },
      { key: 'dateFrom', type: 'date', label: 'From' },
      { key: 'dateTo', type: 'date', label: 'To' },
    ],
    kpis: [
      { key: 'inputGst', label: 'Input GST', format: moneyCell },
      { key: 'outputGst', label: 'Output GST', format: moneyCell },
      { key: 'netGstPayable', label: 'Net GST', format: moneyCell },
      { key: 'taxableAmount', label: 'Taxable', format: moneyCell },
    ],
    columns: [
      { key: 'date', title: 'Date', render: dateCell },
      { key: 'category', title: 'Category', render: badgeCell },
      { key: 'partyName', title: 'Party', render: textCell },
      { key: 'referenceNumber', title: 'Reference', render: textCell },
      { key: 'taxableAmount', title: 'Taxable', render: moneyCell },
      { key: 'gstAmount', title: 'GST', render: moneyCell },
      { key: 'gstType', title: 'GST Type', render: textCell },
    ],
  },
};

function getInitialFilters(config) {
  return (config.filters || []).reduce(
    (values, filter) => ({
      ...values,
      [filter.key]: filter.key === 'threshold' ? '10' : '',
    }),
    { search: '' },
  );
}

function buildParams(filters, page) {
  return Object.entries({ ...filters, page }).reduce((params, [key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      params[key] = value;
    }

    return params;
  }, {});
}

function renderReportCell(column, row) {
  return column.render ? column.render(row[column.key], row) : row[column.key];
}

function flattenValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function downloadFile({ filename, mimeType, content }) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toCsv(columns, rows) {
  const escape = (value) => `"${flattenValue(value).replace(/"/g, '""')}"`;
  return [
    columns.map((column) => escape(column.title)).join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column.key])).join(',')),
  ].join('\n');
}

function toExcelTable(columns, rows, title) {
  const cell = (value, tag = 'td') =>
    `<${tag}>${flattenValue(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</${tag}>`;

  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><caption>${title}</caption><thead><tr>${columns
    .map((column) => cell(column.title, 'th'))
    .join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${columns.map((column) => cell(row[column.key])).join('')}</tr>`)
    .join('')}</tbody></table></body></html>`;
}

function openPrintWindow(columns, rows, title, summary) {
  const summaryRows = Object.entries(summary || {})
    .map(([key, value]) => `<div><strong>${key}</strong>: ${flattenValue(value)}</div>`)
    .join('');
  const table = toExcelTable(columns, rows, title);
  const win = window.open('', '_blank', 'noopener,noreferrer');

  if (!win) {
    window.print();
    return;
  }

  win.document.write(
    table.replace(
      '<body>',
      `<body><h1>${title}</h1><section>${summaryRows}</section>`,
    ),
  );
  win.document.close();
  win.focus();
  win.print();
}

function KpiGrid({ config, summary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {(config.kpis || []).map((kpi) => (
        <div key={kpi.key} className="rounded-3xl border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-body">
            {kpi.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-heading">
            {kpi.format ? kpi.format(summary?.[kpi.key]) : formatValue(summary?.[kpi.key])}
          </p>
        </div>
      ))}
    </div>
  );
}

function FilterControl({ filter, value, onChange }) {
  if (filter.type === 'select') {
    return (
      <Select
        label={filter.label}
        value={value}
        onChange={(event) => onChange(filter.key, event.target.value)}
        options={filter.options}
        placeholder={`All ${filter.label}`}
      />
    );
  }

  return (
    <Input
      label={filter.label}
      type={filter.type}
      min={filter.type === 'number' ? '0' : undefined}
      step={filter.type === 'number' ? '0.01' : undefined}
      value={value}
      onChange={(event) => onChange(filter.key, event.target.value)}
    />
  );
}

function ReportsPage() {
  const [activeReport, setActiveReport] = useState('purchases');
  const config = reports[activeReport];
  const activeTab = reportTabs.find((tab) => tab.key === activeReport);
  const [filters, setFilters] = useState(() => getInitialFilters(config));
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [state, setState] = useState({
    summary: {},
    items: [],
    pagination: {
      page: 1,
      totalPages: 1,
      totalItems: 0,
      limit: 15,
    },
  });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const nextFilters = getInitialFilters(config);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setState((current) => ({
      ...current,
      items: [],
      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 15,
      },
    }));
  }, [activeReport, config]);

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      setLoading(true);

      try {
        const data = await fetchReport(activeTab.endpoint, {
          ...buildParams(appliedFilters, state.pagination.page),
          limit: state.pagination.limit,
        });

        if (!ignore) {
          setState(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load report', getApiErrorMessage(error));
          setState((current) => ({ ...current, items: [], summary: {} }));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      ignore = true;
    };
  }, [activeTab.endpoint, appliedFilters, state.pagination.limit, state.pagination.page, toast]);

  const columns = useMemo(() => config.columns || [], [config]);
  const dataTableColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        render: (row) => renderReportCell(column, row),
      })),
    [columns],
  );
  const exportRows = state.items || [];
  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    setState((current) => ({
      ...current,
      pagination: {
        ...current.pagination,
        page: 1,
      },
    }));
  }

  function resetFilters() {
    const nextFilters = getInitialFilters(config);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setState((current) => ({
      ...current,
      pagination: {
        ...current.pagination,
        page: 1,
      },
    }));
  }

  function exportCsv() {
    downloadFile({
      filename: `${activeReport}-report.csv`,
      mimeType: 'text/csv;charset=utf-8',
      content: toCsv(columns, exportRows),
    });
  }

  function exportExcel() {
    downloadFile({
      filename: `${activeReport}-report.xls`,
      mimeType: 'application/vnd.ms-excel;charset=utf-8',
      content: toExcelTable(columns, exportRows, config.title),
    });
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Reports Module</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">Reports</h1>
            <p className="mt-2 max-w-2xl text-sm text-body">
              Read-only operational and finance reports powered by backend totals.
            </p>
          </div>
          <Badge variant="neutral">
            {state.pagination.totalItems} record
            {state.pagination.totalItems === 1 ? '' : 's'}
          </Badge>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto border-b border-border">
          {reportTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn(
                'shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition',
                activeReport === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-body hover:text-heading',
              )}
              onClick={() => setActiveReport(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="section-title">{config.title}</h2>
            <p className="section-copy mt-2">{config.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" title="Export to CSV" onClick={exportCsv} disabled={!exportRows.length}>
              <Download className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="success" title="Export to Excel" onClick={exportExcel} disabled={!exportRows.length}>
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              title="Print Report"
              onClick={() => openPrintWindow(columns, exportRows, config.title, state.summary)}
              disabled={!exportRows.length}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <KpiGrid config={config} summary={state.summary} />
        </div>

        {state.summary?.profitUnavailableReason ? (
          <div className="mt-4 rounded-3xl border border-warning bg-warning-tint p-4 text-sm font-medium text-warning">
            {state.summary.profitUnavailableReason}
          </div>
        ) : null}

        <div className="mt-6">
          <DataTable
            columns={dataTableColumns}
            data={exportRows}
            loading={loading}
            loadingContent="Loading report rows..."
            pagination={state.pagination}
            onPageChange={(page) =>
              setState((current) => ({
                ...current,
                pagination: {
                  ...current.pagination,
                  page,
                },
              }))
            }
            onRowsPerPageChange={(limit) =>
              setState((current) => ({
                ...current,
                pagination: {
                  ...current.pagination,
                  limit,
                  page: 1,
                },
              }))
            }
            filters={
              <form
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                onSubmit={applyFilters}
              >
                <Input
                  label="Search"
                  value={filters.search || ''}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  placeholder={config.searchPlaceholder}
                />
                {(config.filters || []).map((filter) => (
                  <FilterControl
                    key={filter.key}
                    filter={filter}
                    value={filters[filter.key] || ''}
                    onChange={updateFilter}
                  />
                ))}
                <div className="flex items-end gap-3">
                  <Button type="submit" className="h-12 w-auto px-4">
                    Apply
                  </Button>
                  <Button type="button" variant="outline" className="h-12 w-auto px-4" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </form>
            }
            emptyContent={
              <EmptyState
                title={hasActiveFilters ? 'No report rows match these filters' : 'No report rows found'}
                description={
                  hasActiveFilters
                    ? 'Try a broader search or clear one of the active filters.'
                    : 'Rows will appear here when backend records are available.'
                }
                actionLabel={hasActiveFilters ? 'Reset Filters' : undefined}
                onAction={hasActiveFilters ? resetFilters : undefined}
                icon={SearchX}
              />
            }
          />
        </div>
      </section>
    </div>
  );
}

export default ReportsPage;
