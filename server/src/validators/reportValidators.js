import { query } from 'express-validator';
import { PURCHASE_GST_TYPES, PURCHASE_PAYMENT_TYPES } from '../utils/purchaseMath.js';
import { SALE_INVOICE_STATUSES, SALE_PAYMENT_TYPES, SALE_STOCK_TYPES } from '../utils/saleMath.js';

const PURCHASE_TYPES = ['Raw Material', 'PU Chemical'];
const PRODUCTION_TYPES = ['rod', 'sheet', 'pu-product'];
const STOCK_CATEGORIES = [
  'raw-material',
  'pu-chemical',
  'rod',
  'sheet',
  'pu-product',
  'legacy-product',
];
const OUTSTANDING_STATUSES = ['pending', 'settled'];

const paginationValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100.')
    .toInt(),
];

const searchValidator = query('search')
  .optional()
  .trim()
  .isLength({ max: 120 })
  .withMessage('Search must be 120 characters or fewer.');

const dateRangeValidators = [
  query('dateFrom')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Date from must be a valid date.'),
  query('dateTo')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Date to must be a valid date.'),
];

const customerValidator = query('customer')
  .optional()
  .trim()
  .isLength({ max: 120 })
  .withMessage('Customer filter must be 120 characters or fewer.');

const supplierValidator = query('supplier')
  .optional()
  .trim()
  .isLength({ max: 120 })
  .withMessage('Supplier filter must be 120 characters or fewer.');

export const purchaseReportValidator = [
  ...paginationValidators,
  searchValidator,
  supplierValidator,
  ...dateRangeValidators,
  query('paymentType')
    .optional({ values: 'falsy' })
    .isIn(PURCHASE_PAYMENT_TYPES)
    .withMessage('Payment type must be Cash, Cheque, Credit, or Advance.'),
  query('purchaseType')
    .optional({ values: 'falsy' })
    .isIn(PURCHASE_TYPES)
    .withMessage('Purchase type must be Raw Material or PU Chemical.'),
  query('status')
    .optional({ values: 'falsy' })
    .isIn(['Paid', 'Partially Paid', 'Pending'])
    .withMessage('Status must be Paid, Partially Paid, or Pending.'),
];

export const salesReportValidator = [
  ...paginationValidators,
  searchValidator,
  customerValidator,
  ...dateRangeValidators,
  query('paymentType')
    .optional({ values: 'falsy' })
    .isIn(SALE_PAYMENT_TYPES)
    .withMessage('Payment type must be Cash or Credit.'),
  query('status')
    .optional({ values: 'falsy' })
    .isIn(SALE_INVOICE_STATUSES)
    .withMessage('Status must be Paid, Partially Paid, Unpaid, or Cancelled.'),
  query('category')
    .optional({ values: 'falsy' })
    .isIn(SALE_STOCK_TYPES)
    .withMessage('Category must be rod, sheet, pu-product, or legacy-product.'),
];

export const productionReportValidator = [
  ...paginationValidators,
  searchValidator,
  ...dateRangeValidators,
  query('type')
    .optional({ values: 'falsy' })
    .isIn(PRODUCTION_TYPES)
    .withMessage('Type must be rod, sheet, or pu-product.'),
];

export const stockReportValidator = [
  ...paginationValidators,
  searchValidator,
  query('category')
    .optional({ values: 'falsy' })
    .isIn(STOCK_CATEGORIES)
    .withMessage('Category must be a supported stock category.'),
];

export const lowStockReportValidator = [
  ...stockReportValidator,
  query('threshold')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Threshold must be 0 or greater.')
    .toFloat(),
  query('includeOutOfStock')
    .optional()
    .isBoolean()
    .withMessage('Include out of stock must be true or false.')
    .toBoolean(),
];

export const customerOutstandingReportValidator = [
  ...paginationValidators,
  searchValidator,
  customerValidator,
  ...dateRangeValidators,
  query('status')
    .optional({ values: 'falsy' })
    .isIn(OUTSTANDING_STATUSES)
    .withMessage('Status must be pending or settled.'),
];

export const supplierOutstandingReportValidator = [
  ...paginationValidators,
  searchValidator,
  supplierValidator,
  ...dateRangeValidators,
  query('status')
    .optional({ values: 'falsy' })
    .isIn(OUTSTANDING_STATUSES)
    .withMessage('Status must be pending or settled.'),
];

export const profitLossReportValidator = [
  ...paginationValidators,
  searchValidator,
  customerValidator,
  supplierValidator,
  ...dateRangeValidators,
];

export const inventoryValueReportValidator = [
  ...paginationValidators,
  searchValidator,
  query('category')
    .optional({ values: 'falsy' })
    .isIn(STOCK_CATEGORIES)
    .withMessage('Category must be a supported stock category.'),
];

export const gstReportValidator = [
  ...paginationValidators,
  searchValidator,
  customerValidator,
  supplierValidator,
  ...dateRangeValidators,
  query('category')
    .optional({ values: 'falsy' })
    .isIn(['purchase', 'sale'])
    .withMessage('Category must be purchase or sale.'),
  query('gstType')
    .optional({ values: 'falsy' })
    .isIn(PURCHASE_GST_TYPES)
    .withMessage('GST type must be None, CGST_SGST, or IGST.'),
];
