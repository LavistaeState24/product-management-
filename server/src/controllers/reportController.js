import CustomerReceivable from '../models/CustomerReceivable.js';
import PaymentHistory from '../models/PaymentHistory.js';
import Product from '../models/Product.js';
import PUProductManufacturingBatch from '../models/PUProductManufacturingBatch.js';
import PUProductStock from '../models/PUProductStock.js';
import Purchase from '../models/Purchase.js';
import PuChemicalStock from '../models/PuChemicalStock.js';
import RawMaterialStock from '../models/RawMaterialStock.js';
import RodProductionBatch from '../models/RodProductionBatch.js';
import RodStock from '../models/RodStock.js';
import Sale from '../models/Sale.js';
import SheetProductionBatch from '../models/SheetProductionBatch.js';
import SheetStock from '../models/SheetStock.js';
import SupplierPayable from '../models/SupplierPayable.js';
import { buildPagination, buildSearchFilter } from '../utils/queryHelpers.js';
import { formatPurchase } from '../utils/formatPurchase.js';
import { formatSale } from '../utils/formatSale.js';
import { roundCurrency as roundPurchaseCurrency } from '../utils/purchaseMath.js';
import { roundCurrency as roundSaleCurrency } from '../utils/saleMath.js';

const LOW_STOCK_THRESHOLD = 10;

function parsePagination(query) {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function parseOptionalDate(value, endOfDay = false) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function buildDateFilter(query, field) {
  const dateFrom = parseOptionalDate(query.dateFrom);
  const dateTo = parseOptionalDate(query.dateTo, true);

  if (!dateFrom && !dateTo) {
    return {};
  }

  return {
    [field]: {
      ...(dateFrom ? { $gte: dateFrom } : {}),
      ...(dateTo ? { $lte: dateTo } : {}),
    },
  };
}

function mergeFilters(...filters) {
  const activeFilters = filters.filter((filter) => filter && Object.keys(filter).length);

  if (!activeFilters.length) {
    return {};
  }

  if (activeFilters.length === 1) {
    return activeFilters[0];
  }

  return { $and: activeFilters };
}

function textRegex(value) {
  return value ? new RegExp(value, 'i') : null;
}

function roundNumber(value) {
  return Number((Number(value || 0)).toFixed(2));
}

function sumBy(rows, field) {
  return roundNumber(rows.reduce((total, row) => total + Number(row[field] || 0), 0));
}

function paginateRows(rows, query) {
  const { page, limit, skip } = parsePagination(query);
  const items = rows.slice(skip, skip + limit);

  return {
    items,
    pagination: buildPagination({ page, limit, totalItems: rows.length }),
  };
}

async function aggregateTotals(Model, match, fields) {
  const group = fields.reduce(
    (memo, field) => ({
      ...memo,
      [field]: { $sum: `$${field}` },
    }),
    { _id: null, count: { $sum: 1 } },
  );
  const [result] = await Model.aggregate([{ $match: match }, { $group: group }]);

  return fields.reduce(
    (memo, field) => ({
      ...memo,
      [field]: roundNumber(result?.[field] || 0),
    }),
    { count: result?.count || 0 },
  );
}

function buildPurchaseReportMatch(query) {
  const search = query.search?.trim();
  const supplier = query.supplier?.trim();
  const status = query.status?.trim();
  const filters = [
    buildDateFilter(query, 'purchaseDate'),
    buildSearchFilter(search, [
      'supplierName',
      'supplierAddress',
      'supplierLocation',
      'gstNo',
      'productName',
      'itemName',
      'unit',
      'paymentType',
      'purchaseType',
      'remarks',
      'notes',
    ]),
  ];

  if (supplier) {
    filters.push({ supplierName: textRegex(supplier) });
  }

  if (query.paymentType) {
    filters.push({ paymentType: query.paymentType });
  }

  if (query.purchaseType) {
    filters.push({ purchaseType: query.purchaseType });
  }

  if (status === 'Paid') {
    filters.push({ dueAmount: { $lte: 0 } });
  } else if (status === 'Partially Paid') {
    filters.push({ dueAmount: { $gt: 0 }, paidAmount: { $gt: 0 } });
  } else if (status === 'Pending') {
    filters.push({ dueAmount: { $gt: 0 }, paidAmount: { $lte: 0 } });
  }

  return mergeFilters(...filters);
}

export async function getPurchaseReport(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const match = buildPurchaseReportMatch(req.query);

  const [items, totalItems, summary] = await Promise.all([
    Purchase.find(match)
      .populate('supplier')
      .populate('product')
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Purchase.countDocuments(match),
    aggregateTotals(Purchase, match, [
      'quantity',
      'basicAmount',
      'gstAmount',
      'cgstAmount',
      'sgstAmount',
      'igstAmount',
      'totalAmount',
      'paidAmount',
      'dueAmount',
    ]),
  ]);

  return res.status(200).json({
    summary,
    items: items.map(formatPurchase),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

function buildSalesReportMatch(query) {
  const search = query.search?.trim();
  const customer = query.customer?.trim();
  const filters = [
    buildDateFilter(query, 'invoiceDate'),
    buildSearchFilter(search, [
      'customerName',
      'customerMobile',
      'customerLocation',
      'customerGST',
      'productName',
      'invoiceNumber',
      'paymentType',
      'invoiceStatus',
      'paymentStatus',
      'notes',
      'remarks',
      'items.productName',
      'items.itemNumber',
      'items.size',
      'items.colour',
    ]),
  ];

  if (customer) {
    filters.push({ customerName: textRegex(customer) });
  }

  if (query.paymentType) {
    filters.push({ paymentType: query.paymentType });
  }

  if (query.status) {
    filters.push({
      $or: [
        { invoiceStatus: query.status },
        { paymentStatus: query.status },
      ],
    });
  }

  if (query.category) {
    filters.push({ 'items.stockType': query.category });
  }

  return mergeFilters(...filters);
}

export async function getSalesReport(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const match = buildSalesReportMatch(req.query);

  const [items, totalItems, summary] = await Promise.all([
    Sale.find(match)
      .populate('customer')
      .populate('product')
      .sort({ invoiceDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Sale.countDocuments(match),
    aggregateTotals(Sale, match, [
      'quantity',
      'subtotal',
      'gstAmount',
      'grandTotal',
      'totalAmount',
      'paidAmount',
      'outstandingAmount',
    ]),
  ]);

  return res.status(200).json({
    summary,
    items: items.map(formatSale),
    pagination: buildPagination({ page, limit, totalItems }),
  });
}

async function getProductionRows(query) {
  const search = query.search?.trim();
  const category = query.type?.trim();
  const dateFilter = buildDateFilter(query, 'dateTime');
  const rodFilter = mergeFilters(
    dateFilter,
    buildSearchFilter(search, [
      'rawMaterialItem',
      'batchNumber',
      'batchId',
      'remarks',
      'rods.item',
      'rods.size',
      'rods.colour',
      'rods.itemNumber',
    ]),
  );
  const sheetFilter = mergeFilters(
    dateFilter,
    buildSearchFilter(search, [
      'rawMaterialItem',
      'batchNumber',
      'batchId',
      'remarks',
      'sheets.itemName',
      'sheets.size',
      'sheets.colour',
      'sheets.itemNumber',
    ]),
  );
  const puFilter = mergeFilters(
    dateFilter,
    buildSearchFilter(search, [
      'puChemicalItem',
      'mocaItem',
      'productName',
      'size',
      'colour',
      'sellingUnit',
      'itemNumber',
      'batchNumber',
      'batchId',
      'remarks',
    ]),
  );

  const [rods, sheets, puProducts] = await Promise.all([
    category && category !== 'rod'
      ? []
      : RodProductionBatch.find(rodFilter).sort({ dateTime: -1, createdAt: -1 }).lean(),
    category && category !== 'sheet'
      ? []
      : SheetProductionBatch.find(sheetFilter).sort({ dateTime: -1, createdAt: -1 }).lean(),
    category && category !== 'pu-product'
      ? []
      : PUProductManufacturingBatch.find(puFilter).sort({ dateTime: -1, createdAt: -1 }).lean(),
  ]);

  return [
    ...rods.map((batch) => ({
      id: batch._id,
      type: 'rod',
      batchNumber: batch.batchNumber,
      batchId: batch.batchId,
      dateTime: batch.dateTime,
      inputItem: batch.rawMaterialItem,
      inputQuantity: batch.quantityUsed,
      outputQuantity: roundNumber((batch.rods || []).reduce((total, item) => total + Number(item.quantity || 0), 0)),
      itemCount: (batch.rods || []).length,
      remarks: batch.remarks || '',
      createdAt: batch.createdAt,
    })),
    ...sheets.map((batch) => ({
      id: batch._id,
      type: 'sheet',
      batchNumber: batch.batchNumber,
      batchId: batch.batchId,
      dateTime: batch.dateTime,
      inputItem: batch.rawMaterialItem,
      inputQuantity: batch.quantityUsed,
      outputQuantity: roundNumber((batch.sheets || []).reduce((total, item) => total + Number(item.quantity || 0), 0)),
      itemCount: (batch.sheets || []).length,
      remarks: batch.remarks || '',
      createdAt: batch.createdAt,
    })),
    ...puProducts.map((batch) => ({
      id: batch._id,
      type: 'pu-product',
      batchNumber: batch.batchNumber,
      batchId: batch.batchId,
      dateTime: batch.dateTime,
      inputItem: `${batch.puChemicalItem} + ${batch.mocaItem}`,
      inputQuantity: roundNumber(Number(batch.chemicalQuantityKg || 0) + Number(batch.mocaQuantityKg || 0)),
      outputQuantity: roundNumber(batch.quantity),
      itemCount: 1,
      remarks: batch.remarks || '',
      createdAt: batch.createdAt,
    })),
  ].sort((left, right) => new Date(right.dateTime) - new Date(left.dateTime));
}

export async function getProductionReport(req, res) {
  const rows = await getProductionRows(req.query);

  return res.status(200).json({
    summary: {
      count: rows.length,
      inputQuantity: sumBy(rows, 'inputQuantity'),
      outputQuantity: sumBy(rows, 'outputQuantity'),
      itemCount: sumBy(rows, 'itemCount'),
    },
    ...paginateRows(rows, req.query),
  });
}

function stockMatchesSearch(row, search) {
  if (!search) {
    return true;
  }

  const value = search.toLowerCase();
  return [
    row.category,
    row.itemName,
    row.itemNumber,
    row.size,
    row.colour,
    row.unit,
  ].some((field) => String(field || '').toLowerCase().includes(value));
}

async function getStockRows(query) {
  const category = query.category?.trim();
  const search = query.search?.trim();
  const [
    rawMaterials,
    puChemicals,
    rods,
    sheets,
    puProducts,
    legacyProducts,
  ] = await Promise.all([
    category && category !== 'raw-material'
      ? []
      : RawMaterialStock.find({}).sort({ itemName: 1, unit: 1 }).lean(),
    category && category !== 'pu-chemical'
      ? []
      : PuChemicalStock.find({}).sort({ itemName: 1, unit: 1 }).lean(),
    category && category !== 'rod'
      ? []
      : RodStock.find({}).sort({ itemNumber: 1 }).lean(),
    category && category !== 'sheet'
      ? []
      : SheetStock.find({}).sort({ itemNumber: 1 }).lean(),
    category && category !== 'pu-product'
      ? []
      : PUProductStock.find({}).sort({ itemNumber: 1 }).lean(),
    category && category !== 'legacy-product'
      ? []
      : Product.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  return [
    ...rawMaterials.map((stock) => ({
      id: stock._id,
      category: 'raw-material',
      itemName: stock.itemName,
      itemNumber: '',
      size: '',
      colour: '',
      quantity: roundNumber(stock.quantity),
      unit: stock.unit,
      updatedAt: stock.updatedAt,
    })),
    ...puChemicals.map((stock) => ({
      id: stock._id,
      category: 'pu-chemical',
      itemName: stock.itemName,
      itemNumber: '',
      size: '',
      colour: '',
      quantity: roundNumber(stock.quantity),
      unit: stock.unit,
      updatedAt: stock.updatedAt,
    })),
    ...rods.map((stock) => ({
      id: stock._id,
      category: 'rod',
      itemName: stock.item,
      itemNumber: stock.itemNumber,
      size: stock.size,
      colour: stock.colour,
      quantity: roundNumber(stock.quantity),
      unit: 'PCS',
      weightKg: roundNumber(stock.weightKg),
      updatedAt: stock.updatedAt,
    })),
    ...sheets.map((stock) => ({
      id: stock._id,
      category: 'sheet',
      itemName: stock.itemName,
      itemNumber: stock.itemNumber,
      size: stock.size,
      colour: stock.colour,
      quantity: roundNumber(stock.quantity),
      unit: 'PCS',
      weightKg: roundNumber(stock.weight),
      updatedAt: stock.updatedAt,
    })),
    ...puProducts.map((stock) => ({
      id: stock._id,
      category: 'pu-product',
      itemName: stock.productName,
      itemNumber: stock.itemNumber,
      size: stock.size,
      colour: stock.colour,
      quantity: roundNumber(stock.quantity),
      unit: stock.sellingUnit,
      updatedAt: stock.updatedAt,
    })),
    ...legacyProducts.map((stock) => ({
      id: stock._id,
      category: 'legacy-product',
      itemName: stock.name,
      itemNumber: '',
      size: '',
      colour: '',
      quantity: roundNumber(stock.currentStock),
      unit: 'PCS',
      updatedAt: stock.updatedAt,
    })),
  ].filter((row) => stockMatchesSearch(row, search));
}

function buildStockSummary(rows) {
  return rows.reduce(
    (summary, row) => {
      const category = row.category;
      const unit = row.unit || 'PCS';
      summary.count += 1;
      summary.totalQuantity = roundNumber(summary.totalQuantity + Number(row.quantity || 0));
      summary.byCategory[category] = summary.byCategory[category] || {
        count: 0,
        totalQuantity: 0,
        byUnit: {},
      };
      summary.byCategory[category].count += 1;
      summary.byCategory[category].totalQuantity = roundNumber(
        summary.byCategory[category].totalQuantity + Number(row.quantity || 0),
      );
      summary.byCategory[category].byUnit[unit] = roundNumber(
        (summary.byCategory[category].byUnit[unit] || 0) + Number(row.quantity || 0),
      );
      return summary;
    },
    {
      count: 0,
      totalQuantity: 0,
      byCategory: {},
    },
  );
}

export async function getStockReport(req, res) {
  const rows = await getStockRows(req.query);

  return res.status(200).json({
    summary: buildStockSummary(rows),
    ...paginateRows(rows, req.query),
  });
}

export async function getLowStockReport(req, res) {
  const threshold = Number(req.query.threshold ?? LOW_STOCK_THRESHOLD);
  const includeOutOfStock = req.query.includeOutOfStock !== false;
  const rows = (await getStockRows(req.query))
    .filter((row) => {
      const quantity = Number(row.quantity || 0);
      return includeOutOfStock ? quantity <= threshold : quantity > 0 && quantity <= threshold;
    })
    .sort((left, right) => Number(left.quantity || 0) - Number(right.quantity || 0));

  return res.status(200).json({
    summary: {
      count: rows.length,
      threshold,
      outOfStockCount: rows.filter((row) => Number(row.quantity || 0) <= 0).length,
      lowStockCount: rows.filter((row) => Number(row.quantity || 0) > 0).length,
    },
    ...paginateRows(rows, req.query),
  });
}

function outstandingMatchesQuery(row, query, partyKey) {
  const search = query.search?.trim()?.toLowerCase();
  const party = query[partyKey]?.trim()?.toLowerCase();

  if (party && !String(row[partyKey] || '').toLowerCase().includes(party)) {
    return false;
  }

  if (!search) {
    return true;
  }

  return [
    row[partyKey],
    row.invoiceNumber,
    row.status,
  ].some((value) => String(value || '').toLowerCase().includes(search));
}

function matchesDateRange(date, query) {
  const from = parseOptionalDate(query.dateFrom);
  const to = parseOptionalDate(query.dateTo, true);
  const value = date ? new Date(date) : null;

  if (!value || Number.isNaN(value.getTime())) {
    return !from && !to;
  }

  if (from && value < from) {
    return false;
  }

  if (to && value > to) {
    return false;
  }

  return true;
}

export async function getCustomerOutstandingReport(req, res) {
  const status = req.query.status?.trim();
  const filter = {
    ...(status ? { status } : {}),
  };
  const receivables = await CustomerReceivable.find(filter)
    .populate('customer', 'name outstandingReceivable')
    .populate('sale', 'invoiceNumber customerName dueDate invoiceDate totalAmount grandTotal paidAmount paid invoiceStatus paymentStatus')
    .sort({ updatedAt: -1 })
    .lean();
  const rows = receivables
    .filter((item) => item.sale)
    .map((item) => ({
      id: item._id,
      customerId: item.customer?._id || item.customer,
      customer: item.customer?.name || item.sale?.customerName || '',
      saleId: item.sale?._id || item.sale,
      invoiceNumber: item.sale?.invoiceNumber || '',
      invoiceDate: item.sale?.invoiceDate || null,
      dueDate: item.sale?.dueDate || null,
      totalAmount: roundSaleCurrency(item.sale?.grandTotal ?? item.sale?.totalAmount ?? 0),
      paidAmount: roundSaleCurrency(item.sale?.paid ?? item.sale?.paidAmount ?? 0),
      outstandingAmount: roundSaleCurrency(item.amount),
      status: item.status,
      invoiceStatus: item.sale?.invoiceStatus || item.sale?.paymentStatus || '',
      updatedAt: item.updatedAt,
    }))
    .filter((row) => matchesDateRange(row.dueDate || row.invoiceDate || row.updatedAt, req.query))
    .filter((row) => outstandingMatchesQuery(row, req.query, 'customer'));

  return res.status(200).json({
    summary: {
      count: rows.length,
      totalAmount: sumBy(rows, 'totalAmount'),
      paidAmount: sumBy(rows, 'paidAmount'),
      outstandingAmount: sumBy(rows, 'outstandingAmount'),
    },
    ...paginateRows(rows, req.query),
  });
}

export async function getSupplierOutstandingReport(req, res) {
  const status = req.query.status?.trim();
  const filter = {
    ...(status ? { status } : {}),
  };
  const payables = await SupplierPayable.find(filter)
    .populate('supplier', 'name outstandingPayable')
    .populate('purchase', 'supplierName purchaseDate dueDate creditDueDate bill totalAmount paidAmount dueAmount')
    .sort({ dueDate: 1, updatedAt: -1 })
    .lean();
  const rows = payables
    .filter((item) => item.purchase)
    .map((item) => ({
      id: item._id,
      supplierId: item.supplier?._id || item.supplier,
      supplier: item.supplier?.name || item.purchase?.supplierName || '',
      purchaseId: item.purchase?._id || item.purchase,
      invoiceNumber: item.purchase?.bill?.originalName || `PUR-${item.purchase?._id || item.purchase}`,
      purchaseDate: item.purchase?.purchaseDate || null,
      dueDate: item.dueDate || item.purchase?.dueDate || item.purchase?.creditDueDate || null,
      totalAmount: roundPurchaseCurrency(item.purchase?.totalAmount || 0),
      paidAmount: roundPurchaseCurrency(item.purchase?.paidAmount || 0),
      outstandingAmount: roundPurchaseCurrency(item.amount),
      status: item.status,
      updatedAt: item.updatedAt,
    }))
    .filter((row) => matchesDateRange(row.dueDate || row.purchaseDate || row.updatedAt, req.query))
    .filter((row) => outstandingMatchesQuery(row, req.query, 'supplier'));

  return res.status(200).json({
    summary: {
      count: rows.length,
      totalAmount: sumBy(rows, 'totalAmount'),
      paidAmount: sumBy(rows, 'paidAmount'),
      outstandingAmount: sumBy(rows, 'outstandingAmount'),
    },
    ...paginateRows(rows, req.query),
  });
}

export async function getProfitLossReport(req, res) {
  const purchaseMatch = buildPurchaseReportMatch(req.query);
  const salesMatch = mergeFilters(buildSalesReportMatch(req.query), {
    invoiceStatus: { $ne: 'Cancelled' },
  });
  const paymentMatch = buildDateFilter(req.query, 'paymentDate');
  const [
    purchaseTotals,
    salesTotals,
    purchasePayments,
    salesPayments,
    receivables,
    payables,
  ] = await Promise.all([
    aggregateTotals(Purchase, purchaseMatch, ['basicAmount', 'gstAmount', 'totalAmount', 'paidAmount', 'dueAmount']),
    aggregateTotals(Sale, salesMatch, ['subtotal', 'gstAmount', 'grandTotal', 'paidAmount', 'outstandingAmount']),
    aggregateTotals(PaymentHistory, { ...paymentMatch, referenceType: 'Purchase' }, ['amount']),
    aggregateTotals(PaymentHistory, { ...paymentMatch, referenceType: 'Sale' }, ['amount']),
    aggregateTotals(CustomerReceivable, { amount: { $gt: 0 }, status: 'pending' }, ['amount']),
    aggregateTotals(SupplierPayable, { amount: { $gt: 0 }, status: 'pending' }, ['amount']),
  ]);
  const rows = [
    {
      section: 'Income',
      metric: 'Sales revenue before GST',
      amount: salesTotals.subtotal,
      source: 'Sale.subtotal',
    },
    {
      section: 'Income',
      metric: 'Sales GST collected',
      amount: salesTotals.gstAmount,
      source: 'Sale.gstAmount',
    },
    {
      section: 'Expense',
      metric: 'Purchase cost before GST',
      amount: purchaseTotals.basicAmount,
      source: 'Purchase.basicAmount',
    },
    {
      section: 'Expense',
      metric: 'Purchase GST paid',
      amount: purchaseTotals.gstAmount,
      source: 'Purchase.gstAmount',
    },
    {
      section: 'Cash Flow',
      metric: 'Customer payments received',
      amount: salesPayments.amount,
      source: 'PaymentHistory.referenceType=Sale',
    },
    {
      section: 'Cash Flow',
      metric: 'Supplier payments made',
      amount: purchasePayments.amount,
      source: 'PaymentHistory.referenceType=Purchase',
    },
    {
      section: 'Outstanding',
      metric: 'Customer receivables',
      amount: receivables.amount,
      source: 'CustomerReceivable.pending',
    },
    {
      section: 'Outstanding',
      metric: 'Supplier payables',
      amount: payables.amount,
      source: 'SupplierPayable.pending',
    },
  ].filter((row) => {
    const search = req.query.search?.trim()?.toLowerCase();
    return !search || `${row.section} ${row.metric} ${row.source}`.toLowerCase().includes(search);
  });

  return res.status(200).json({
    summary: {
      salesRevenueBeforeGst: salesTotals.subtotal,
      purchaseCostBeforeGst: purchaseTotals.basicAmount,
      outputGst: salesTotals.gstAmount,
      inputGst: purchaseTotals.gstAmount,
      netGstPayable: roundNumber(salesTotals.gstAmount - purchaseTotals.gstAmount),
      customerPaymentsReceived: salesPayments.amount,
      supplierPaymentsMade: purchasePayments.amount,
      customerReceivables: receivables.amount,
      supplierPayables: payables.amount,
      costOfGoodsSold: null,
      grossProfit: null,
      netProfit: null,
      profitUnavailableReason:
        'Finished goods stock and sales items do not store a cost snapshot, so COGS and profit are not calculated.',
    },
    ...paginateRows(rows, req.query),
  });
}

async function getPurchaseAverageCostLookup() {
  const rows = await Purchase.aggregate([
    {
      $match: {
        quantity: { $gt: 0 },
        basicAmount: { $gte: 0 },
      },
    },
    {
      $group: {
        _id: {
          purchaseType: '$purchaseType',
          itemName: '$itemName',
          unit: '$unit',
        },
        quantity: { $sum: '$quantity' },
        amount: { $sum: '$basicAmount' },
      },
    },
  ]);

  return rows.reduce((lookup, row) => {
    const key = `${row._id.purchaseType || 'Raw Material'}:${row._id.itemName}:${row._id.unit}`;
    lookup[key] = {
      unitCost: row.quantity > 0 ? roundNumber(row.amount / row.quantity) : null,
      sourceQuantity: roundNumber(row.quantity),
      sourceAmount: roundNumber(row.amount),
    };
    return lookup;
  }, {});
}

export async function getInventoryValueReport(req, res) {
  const [stockRows, costLookup] = await Promise.all([
    getStockRows(req.query),
    getPurchaseAverageCostLookup(),
  ]);
  const rows = stockRows.map((row) => {
    const purchaseType = row.category === 'pu-chemical' ? 'PU Chemical' : 'Raw Material';
    const cost = ['raw-material', 'pu-chemical'].includes(row.category)
      ? costLookup[`${purchaseType}:${row.itemName}:${row.unit}`]
      : null;
    const inventoryValue = cost?.unitCost == null
      ? null
      : roundNumber(Number(row.quantity || 0) * cost.unitCost);

    return {
      ...row,
      unitCost: cost?.unitCost ?? null,
      inventoryValue,
      valuationStatus: inventoryValue == null ? 'unavailable' : 'valued',
      valuationSource: inventoryValue == null
        ? 'No stored cost data is available for this stock category/item.'
        : 'Weighted average of Purchase.basicAmount divided by Purchase.quantity.',
    };
  });

  return res.status(200).json({
    summary: {
      count: rows.length,
      valuedItemCount: rows.filter((row) => row.valuationStatus === 'valued').length,
      unavailableItemCount: rows.filter((row) => row.valuationStatus === 'unavailable').length,
      totalKnownInventoryValue: roundNumber(
        rows.reduce((total, row) => total + Number(row.inventoryValue || 0), 0),
      ),
    },
    ...paginateRows(rows, req.query),
  });
}

function buildGstRowsFromPurchase(purchase) {
  return {
    id: purchase._id,
    category: 'purchase',
    date: purchase.purchaseDate,
    partyName: purchase.supplierName,
    referenceNumber: purchase.bill?.originalName || `PUR-${purchase._id}`,
    taxableAmount: roundPurchaseCurrency(purchase.basicAmount || 0),
    gstType: purchase.gstType || 'None',
    gstRate: roundNumber(purchase.gstRate),
    gstAmount: roundPurchaseCurrency(purchase.gstAmount || 0),
    cgstAmount: roundPurchaseCurrency(purchase.cgstAmount || 0),
    sgstAmount: roundPurchaseCurrency(purchase.sgstAmount || 0),
    igstAmount: roundPurchaseCurrency(purchase.igstAmount || 0),
  };
}

function buildGstRowsFromSale(sale) {
  return {
    id: sale._id,
    category: 'sale',
    date: sale.invoiceDate,
    partyName: sale.customerName,
    referenceNumber: sale.invoiceNumber,
    taxableAmount: roundSaleCurrency(sale.subtotal || 0),
    gstType: sale.gstDetails?.gstType || null,
    gstRate: null,
    gstAmount: roundSaleCurrency(sale.gstAmount || 0),
    cgstAmount: null,
    sgstAmount: null,
    igstAmount: null,
  };
}

export async function getGstReport(req, res) {
  const category = req.query.category?.trim();
  const search = req.query.search?.trim()?.toLowerCase();
  const purchaseMatch = buildPurchaseReportMatch(req.query);
  const salesMatch = mergeFilters(buildSalesReportMatch(req.query), {
    invoiceStatus: { $ne: 'Cancelled' },
  });
  const [purchases, sales] = await Promise.all([
    category && category !== 'purchase'
      ? []
      : Purchase.find(purchaseMatch).sort({ purchaseDate: -1, createdAt: -1 }).lean(),
    category && category !== 'sale'
      ? []
      : Sale.find(salesMatch).sort({ invoiceDate: -1, createdAt: -1 }).lean(),
  ]);
  const rows = [
    ...purchases.map(buildGstRowsFromPurchase),
    ...sales.map(buildGstRowsFromSale),
  ]
    .filter((row) => !req.query.gstType || row.gstType === req.query.gstType)
    .filter((row) => (
      !search ||
      [row.category, row.partyName, row.referenceNumber, row.gstType]
        .some((value) => String(value || '').toLowerCase().includes(search))
    ))
    .sort((left, right) => new Date(right.date) - new Date(left.date));

  const inputGst = roundNumber(
    rows
      .filter((row) => row.category === 'purchase')
      .reduce((total, row) => total + Number(row.gstAmount || 0), 0),
  );
  const outputGst = roundNumber(
    rows
      .filter((row) => row.category === 'sale')
      .reduce((total, row) => total + Number(row.gstAmount || 0), 0),
  );

  return res.status(200).json({
    summary: {
      count: rows.length,
      taxableAmount: sumBy(rows, 'taxableAmount'),
      inputGst,
      outputGst,
      cgstAmount: sumBy(rows, 'cgstAmount'),
      sgstAmount: sumBy(rows, 'sgstAmount'),
      igstAmount: sumBy(rows, 'igstAmount'),
      netGstPayable: roundNumber(outputGst - inputGst),
    },
    ...paginateRows(rows, req.query),
  });
}
