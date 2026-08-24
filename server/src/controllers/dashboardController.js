import CustomerReceivable from '../models/CustomerReceivable.js';
import PUProductManufacturingBatch from '../models/PUProductManufacturingBatch.js';
import PUProductStock from '../models/PUProductStock.js';
import Product from '../models/Product.js';
import PuChemicalStock from '../models/PuChemicalStock.js';
import Purchase from '../models/Purchase.js';
import RawMaterialStock from '../models/RawMaterialStock.js';
import RodProductionBatch from '../models/RodProductionBatch.js';
import RodStock from '../models/RodStock.js';
import Sale from '../models/Sale.js';
import SheetProductionBatch from '../models/SheetProductionBatch.js';
import SheetStock from '../models/SheetStock.js';
import SupplierPayable from '../models/SupplierPayable.js';
import { canAccess } from '../middleware/rbacMiddleware.js';
import { listOrderNotifications } from '../services/orderService.js';
import { resolveReminderType } from '../services/paymentHistoryService.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { DASHBOARD_PERIODS } from '../validators/dashboardValidators.js';

const LOW_STOCK_THRESHOLD = 10;
const DUE_SOON_DAYS = 3;
const DEFAULT_PERIOD = 'this-month';

const ORDER_NOTIFICATION_TYPES = {
  accepted: 'Order Accepted',
  progress: 'Order Progress',
  ready: 'Order Ready for Dispatch',
};

function roundNumber(value) {
  return Number((Number(value || 0)).toFixed(2));
}

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDueSoonThreshold(today) {
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + DUE_SOON_DAYS + 1);
  return threshold;
}

function addMonths(date, delta) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + delta);
  return next;
}

function getStartOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDateRange(period) {
  const now = new Date();
  const safePeriod = DASHBOARD_PERIODS.includes(period) ? period : DEFAULT_PERIOD;

  if (safePeriod === 'this-year') {
    return {
      period: safePeriod,
      startDate: new Date(now.getFullYear(), 0, 1),
      endDate: now,
      graphMonths: 12,
    };
  }

  if (safePeriod === 'last-6-months') {
    return {
      period: safePeriod,
      startDate: getStartOfMonth(addMonths(now, -5)),
      endDate: now,
      graphMonths: 6,
    };
  }

  if (safePeriod === 'last-3-months') {
    return {
      period: safePeriod,
      startDate: getStartOfMonth(addMonths(now, -2)),
      endDate: now,
      graphMonths: 6,
    };
  }

  return {
    period: safePeriod,
    startDate: getStartOfMonth(now),
    endDate: now,
    graphMonths: 6,
  };
}

function getMonthKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthLabel(date) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function buildMonthBuckets(monthCount, endDate = new Date()) {
  const endMonth = getStartOfMonth(endDate);

  return Array.from({ length: monthCount }, (_, index) => {
    const date = addMonths(endMonth, index - monthCount + 1);
    return {
      key: getMonthKey(date),
      label: getMonthLabel(date),
    };
  });
}

function monthGroup(dateField) {
  return {
    year: { $year: dateField },
    month: { $month: dateField },
  };
}

function normalizeMonthlyResults(results) {
  return results.reduce((lookup, item) => {
    const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
    lookup[key] = item;
    return lookup;
  }, {});
}

function buildUnitSummary(rows) {
  const byUnit = rows.reduce((summary, row) => {
    summary[row._id || 'PCS'] = roundNumber(row.quantity);
    return summary;
  }, {});

  return {
    totalQuantity: roundNumber(rows.reduce((total, row) => total + Number(row.quantity || 0), 0)),
    byUnit,
  };
}

async function aggregateUnitStock(Model, unitField = 'unit', quantityField = 'quantity', match = {}) {
  const rows = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: `$${unitField}`,
        quantity: { $sum: `$${quantityField}` },
        itemCount: { $sum: 1 },
      },
    },
  ]);

  return {
    ...buildUnitSummary(rows),
    itemCount: rows.reduce((total, row) => total + Number(row.itemCount || 0), 0),
  };
}

async function aggregateWeightedStock(Model, weightField, match = {}) {
  const [result] = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        pcs: { $sum: '$quantity' },
        kg: { $sum: { $multiply: ['$quantity', `$${weightField}`] } },
        itemCount: { $sum: 1 },
      },
    },
  ]);

  return {
    totalQuantity: roundNumber(result?.pcs || 0),
    byUnit: {
      PCS: roundNumber(result?.pcs || 0),
      Kg: roundNumber(result?.kg || 0),
    },
    itemCount: result?.itemCount || 0,
  };
}

async function getStockSummary() {
  const [
    rawMaterialStock,
    puChemicalStock,
    rodStock,
    sheetStock,
    puProductStock,
    legacyProductStock,
  ] = await Promise.all([
    aggregateUnitStock(RawMaterialStock),
    aggregateUnitStock(PuChemicalStock),
    aggregateWeightedStock(RodStock, 'weightKg'),
    aggregateWeightedStock(SheetStock, 'weight'),
    aggregateUnitStock(PUProductStock, 'sellingUnit', 'quantity'),
    aggregateUnitStock(Product, null, 'currentStock', { isActive: true }),
  ]);

  return {
    rawMaterialStock,
    puChemicalStock,
    rodStock,
    sheetStock,
    finishedProductStock: {
      rod: rodStock,
      sheet: sheetStock,
      puProduct: puProductStock,
      legacyProduct: legacyProductStock,
      totalQuantity: roundNumber(
        rodStock.byUnit.PCS +
        sheetStock.byUnit.PCS +
        puProductStock.totalQuantity +
        legacyProductStock.totalQuantity,
      ),
    },
  };
}

async function countStockAlertsForModel(Model, quantityField = 'quantity', match = {}) {
  const [lowStockCount, outOfStockCount] = await Promise.all([
    Model.countDocuments({
      ...match,
      [quantityField]: { $gt: 0, $lte: LOW_STOCK_THRESHOLD },
    }),
    Model.countDocuments({
      ...match,
      [quantityField]: { $lte: 0 },
    }),
  ]);

  return { lowStockCount, outOfStockCount };
}

async function getAlertCounts() {
  const counts = await Promise.all([
    countStockAlertsForModel(RawMaterialStock),
    countStockAlertsForModel(PuChemicalStock),
    countStockAlertsForModel(RodStock),
    countStockAlertsForModel(SheetStock),
    countStockAlertsForModel(PUProductStock),
    countStockAlertsForModel(Product, 'currentStock', { isActive: true }),
  ]);

  return counts.reduce(
    (total, item) => ({
      lowStockCount: total.lowStockCount + item.lowStockCount,
      outOfStockCount: total.outOfStockCount + item.outOfStockCount,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    }),
    {
      lowStockCount: 0,
      outOfStockCount: 0,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    },
  );
}

async function getPaymentSummary(today) {
  const [
    purchaseOutstanding,
    purchaseOverdueCount,
    customerOutstanding,
    customerOverdueRows,
  ] = await Promise.all([
    SupplierPayable.aggregate([
      { $match: { amount: { $gt: 0 }, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    SupplierPayable.countDocuments({
      amount: { $gt: 0 },
      status: 'pending',
      dueDate: { $lt: today },
    }),
    CustomerReceivable.aggregate([
      { $match: { amount: { $gt: 0 }, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    CustomerReceivable.aggregate([
      { $match: { amount: { $gt: 0 }, status: 'pending' } },
      {
        $lookup: {
          from: 'sales',
          localField: 'sale',
          foreignField: '_id',
          as: 'sale',
        },
      },
      { $unwind: '$sale' },
      {
        $match: {
          'sale.dueDate': { $lt: today },
          'sale.invoiceStatus': { $ne: 'Cancelled' },
        },
      },
      { $count: 'count' },
    ]),
  ]);

  return {
    purchaseOutstandingAmount: roundNumber(purchaseOutstanding[0]?.total || 0),
    purchaseOverdueCount,
    customerOutstandingAmount: roundNumber(customerOutstanding[0]?.total || 0),
    customerOverdueCount: customerOverdueRows[0]?.count || 0,
  };
}

async function getBusinessSummary({ startDate, endDate }) {
  const [sales, purchases] = await Promise.all([
    Sale.aggregate([
      {
        $match: {
          invoiceDate: { $gte: startDate, $lte: endDate },
          invoiceStatus: { $ne: 'Cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $ifNull: ['$grandTotal', '$totalAmount'] } },
          salesInvoiceCount: { $sum: 1 },
        },
      },
    ]),
    Purchase.aggregate([
      {
        $match: {
          purchaseDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$totalAmount' },
        },
      },
    ]),
  ]);

  const totalSales = roundNumber(sales[0]?.totalSales || 0);
  const totalPurchases = roundNumber(purchases[0]?.totalPurchases || 0);

  return {
    totalSales,
    totalPurchases,
    grossDifference: roundNumber(totalSales - totalPurchases),
    salesInvoiceCount: sales[0]?.salesInvoiceCount || 0,
  };
}

async function getMonthlySales(monthStart) {
  return Sale.aggregate([
    {
      $match: {
        invoiceDate: { $gte: monthStart },
        invoiceStatus: { $ne: 'Cancelled' },
      },
    },
    {
      $group: {
        _id: monthGroup('$invoiceDate'),
        totalSales: { $sum: { $ifNull: ['$grandTotal', '$totalAmount'] } },
        invoiceCount: { $sum: 1 },
      },
    },
  ]);
}

async function getRodProduction(monthStart) {
  return RodProductionBatch.aggregate([
    { $match: { dateTime: { $gte: monthStart } } },
    { $unwind: '$rods' },
    {
      $group: {
        _id: monthGroup('$dateTime'),
        quantity: { $sum: '$rods.quantity' },
      },
    },
  ]);
}

async function getSheetProduction(monthStart) {
  return SheetProductionBatch.aggregate([
    { $match: { dateTime: { $gte: monthStart } } },
    { $unwind: '$sheets' },
    {
      $group: {
        _id: monthGroup('$dateTime'),
        quantity: { $sum: '$sheets.quantity' },
      },
    },
  ]);
}

async function getPuProductProduction(monthStart) {
  return PUProductManufacturingBatch.aggregate([
    { $match: { dateTime: { $gte: monthStart } } },
    {
      $group: {
        _id: monthGroup('$dateTime'),
        quantity: { $sum: '$quantity' },
      },
    },
  ]);
}

async function getStockIn(monthStart) {
  return Purchase.aggregate([
    { $match: { purchaseDate: { $gte: monthStart } } },
    {
      $group: {
        _id: monthGroup('$purchaseDate'),
        quantity: { $sum: '$quantity' },
      },
    },
  ]);
}

async function getStockOut(monthStart) {
  return Sale.aggregate([
    {
      $match: {
        invoiceDate: { $gte: monthStart },
        invoiceStatus: { $ne: 'Cancelled' },
      },
    },
    { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: monthGroup('$invoiceDate'),
        quantity: { $sum: { $ifNull: ['$items.quantity', '$quantity'] } },
      },
    },
  ]);
}

async function getGraphData({ graphMonths, endDate }) {
  const buckets = buildMonthBuckets(graphMonths, endDate);
  const monthStart = getStartOfMonth(addMonths(endDate, -graphMonths + 1));
  const [
    sales,
    rodProduction,
    sheetProduction,
    puProductProduction,
    stockIn,
    stockOut,
  ] = await Promise.all([
    getMonthlySales(monthStart),
    getRodProduction(monthStart),
    getSheetProduction(monthStart),
    getPuProductProduction(monthStart),
    getStockIn(monthStart),
    getStockOut(monthStart),
  ]);
  const salesByMonth = normalizeMonthlyResults(sales);
  const rodsByMonth = normalizeMonthlyResults(rodProduction);
  const sheetsByMonth = normalizeMonthlyResults(sheetProduction);
  const puProductsByMonth = normalizeMonthlyResults(puProductProduction);
  const stockInByMonth = normalizeMonthlyResults(stockIn);
  const stockOutByMonth = normalizeMonthlyResults(stockOut);

  return {
    monthlySales: buckets.map((bucket) => ({
      month: bucket.key,
      label: bucket.label,
      totalSales: roundNumber(salesByMonth[bucket.key]?.totalSales || 0),
      invoiceCount: salesByMonth[bucket.key]?.invoiceCount || 0,
    })),
    monthlyProduction: buckets.map((bucket) => ({
      month: bucket.key,
      label: bucket.label,
      rod: roundNumber(rodsByMonth[bucket.key]?.quantity || 0),
      sheet: roundNumber(sheetsByMonth[bucket.key]?.quantity || 0),
      puProduct: roundNumber(puProductsByMonth[bucket.key]?.quantity || 0),
    })),
    stockMovement: buckets.map((bucket) => ({
      month: bucket.key,
      label: bucket.label,
      stockIn: roundNumber(stockInByMonth[bucket.key]?.quantity || 0),
      stockOut: roundNumber(stockOutByMonth[bucket.key]?.quantity || 0),
    })),
  };
}

function formatStockAlert(type, item, priority, routeKey) {
  const quantity = Number(item.quantity ?? item.currentStock ?? 0);

  return {
    id: String(item._id),
    type: priority === 1 ? 'Out of Stock' : 'Low Stock',
    priority,
    stockType: type,
    routeKey,
    stockId: String(item._id),
    itemName: item.itemName || item.item || item.productName || item.name || 'Stock item',
    itemNumber: item.itemNumber || '',
    quantity: roundNumber(quantity),
  };
}

async function getStockAlertItems(Model, type, quantityField = 'quantity', match = {}, routeKey = 'stock') {
  const [outOfStock, lowStock] = await Promise.all([
    Model.find({ ...match, [quantityField]: { $lte: 0 } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
    Model.find({ ...match, [quantityField]: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } })
      .sort({ [quantityField]: 1, updatedAt: -1 })
      .limit(5)
      .lean(),
  ]);

  return [
    ...outOfStock.map((item) => formatStockAlert(type, item, 1, routeKey)),
    ...lowStock.map((item) => formatStockAlert(type, item, 2, routeKey)),
  ];
}

async function getSupplierPaymentAlerts(today, soonThreshold) {
  const items = await SupplierPayable.find({
    amount: { $gt: 0 },
    status: 'pending',
    dueDate: { $lt: soonThreshold },
  })
    .populate('supplier', 'name')
    .populate('purchase', 'bill supplierName')
    .sort({ dueDate: 1 })
    .lean();

  return items.map((item) => {
    const isOverdue = resolveReminderType(item.dueDate, today) === 'Overdue';

    return {
      id: String(item._id),
      type: isOverdue ? 'Supplier Payment Overdue' : 'Supplier Payment Due Soon',
      priority: isOverdue ? 3 : 5,
      isOverdue,
      routeKey: 'purchase',
      purchaseId: item.purchase?._id ? String(item.purchase._id) : null,

      supplier: {
        id: item.supplier?._id || item.supplier,
        name:
          item.supplier?.name ||
          item.purchase?.supplierName ||
          'Supplier',
      },

      invoiceNumber:
        item.purchase?.bill?.originalName ||
        `PUR-${item.purchase?._id || item.purchase}`,

      outstandingAmount: roundNumber(item.amount),
      dueDate: item.dueDate,
      createdAt: item.updatedAt || item.createdAt,
    };
  });
}

async function getCustomerPaymentAlerts(today, soonThreshold) {
  const items = await CustomerReceivable.find({
    amount: { $gt: 0 },
    status: 'pending',
  })
    .populate('customer', 'name')
    .populate({
      path: 'sale',
      select: 'invoiceNumber customerName dueDate invoiceStatus',
      match: {
        dueDate: { $lt: soonThreshold },
        invoiceStatus: { $ne: 'Cancelled' },
      },
    })
    .sort({ updatedAt: -1 })
    .lean();

  return items
    .filter((item) => item.sale)
    .map((item) => {
      const isOverdue = resolveReminderType(item.sale.dueDate, today) === 'Overdue';

      return {
        id: String(item._id),
        type: isOverdue ? 'Customer Payment Overdue' : 'Customer Payment Due Soon',
        priority: isOverdue ? 4 : 6,
        isOverdue,
        routeKey: 'sale',
        saleId: item.sale?._id ? String(item.sale._id) : null,
        customer: {
          id: item.customer?._id || item.customer,
          name: item.customer?.name || item.sale?.customerName || 'Customer',
        },
        invoiceNumber: item.sale?.invoiceNumber || `SAL-${item.sale?._id || item.sale}`,
        amountReceivable: roundNumber(item.amount),
        dueDate: item.sale?.dueDate,
        createdAt: item.updatedAt || item.createdAt,
      };
    });
}

function formatOrderNotificationAlert(notification) {
  return {
    id: String(notification._id),
    type: ORDER_NOTIFICATION_TYPES[notification.kind] || 'Order Update',
    priority: notification.seen ? 8 : 0,
    routeKey: 'order',
    orderId: notification.order ? String(notification.order) : null,
    orderNo: notification.orderNo,
    message: notification.message,
    seen: notification.seen,
    createdAt: notification.createdAt,
  };
}

async function getOrderNotificationAlerts(user) {
  if (!canAccess(user, [PERMISSIONS.canViewOrderClientDetails])) {
    return [];
  }

  const notifications = await listOrderNotifications();
  return notifications.map(formatOrderNotificationAlert);
}

async function getImportantAlerts(today, user) {
  const soonThreshold = getDueSoonThreshold(today);
  const stockAlerts = await Promise.all([
    getStockAlertItems(RawMaterialStock, 'Raw Material Stock', 'quantity', {}, 'raw-material'),
    getStockAlertItems(PuChemicalStock, 'PU Chemical Stock', 'quantity', {}, 'pu-chemical'),
    getStockAlertItems(RodStock, 'Rod Stock', 'quantity', {}, 'rod'),
    getStockAlertItems(SheetStock, 'Sheet Stock', 'quantity', {}, 'sheet'),
    getStockAlertItems(PUProductStock, 'Finished Product Stock', 'quantity', {}, 'pu-product'),
    getStockAlertItems(Product, 'Finished Product Stock', 'currentStock', { isActive: true }, 'legacy-product'),
  ]);
  const [supplierAlerts, customerAlerts, orderAlerts] = await Promise.all([
    getSupplierPaymentAlerts(today, soonThreshold),
    getCustomerPaymentAlerts(today, soonThreshold),
    getOrderNotificationAlerts(user),
  ]);

  const flatStockAlerts = stockAlerts.flat();

  const importantAlerts = [
    ...flatStockAlerts,
    ...supplierAlerts.filter((alert) => alert.isOverdue),
    ...customerAlerts.filter((alert) => alert.isOverdue),
  ]
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 5);

  const notificationFeed = [
    ...flatStockAlerts,
    ...supplierAlerts,
    ...customerAlerts,
    ...orderAlerts,
  ].sort((left, right) => left.priority - right.priority);

  return { importantAlerts, notificationFeed };
}

export async function getDashboard(req, res) {
  const range = getDateRange(req.query.period);
  const today = getStartOfToday();
  const [
    stock,
    alerts,
    payments,
    businessSummary,
    graphData,
    alertsResult,
  ] = await Promise.all([
    getStockSummary(),
    getAlertCounts(),
    getPaymentSummary(today),
    getBusinessSummary(range),
    getGraphData(range),
    getImportantAlerts(today, req.user),
  ]);

  return res.status(200).json({
    period: range.period,
    dateRange: {
      startDate: range.startDate,
      endDate: range.endDate,
    },
    stock,
    alerts,
    payments,
    businessSummary,
    graphData,
    importantAlerts: alertsResult.importantAlerts,
    notificationFeed: alertsResult.notificationFeed,
  });
}
