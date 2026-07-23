import { body, param, query } from 'express-validator';
import {
  SALE_INVOICE_STATUSES,
  SALE_PAYMENT_TYPES,
  SALE_STOCK_TYPES,
} from '../utils/saleMath.js';

function hasItems(req) {
  return Array.isArray(req.body.items) && req.body.items.length > 0;
}

const customerValidator = body('customerName')
  .if((value, { req }) => !req.body.partyDetails?.name)
  .trim()
  .notEmpty()
  .withMessage('Customer is required.')
  .isLength({ max: 120 })
  .withMessage('Customer must be 120 characters or fewer.');

const partyNameValidator = body('partyDetails.name')
  .optional({ values: 'falsy' })
  .trim()
  .isLength({ max: 120 })
  .withMessage('Party name must be 120 characters or fewer.');

const customerMobileValidator = body('customerMobile')
  .optional({ values: 'falsy' })
  .trim()
  .matches(/^[0-9+\-\s()]{7,20}$/)
  .withMessage('Customer mobile must be a valid phone number.');

const customerAddressValidator = body('customerAddress')
  .optional({ values: 'falsy' })
  .trim()
  .isLength({ max: 500 })
  .withMessage('Customer address must be 500 characters or fewer.');

const customerLocationValidator = body('customerLocation')
  .optional({ values: 'falsy' })
  .trim()
  .isLength({ max: 120 })
  .withMessage('Customer location must be 120 characters or fewer.');

const customerGSTValidator = body('customerGST')
  .optional({ values: 'falsy' })
  .trim()
  .toUpperCase()
  .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
  .withMessage('Customer GST must be a valid GSTIN.');

const legacyProductValidator = body('productName')
  .if((value, { req }) => !hasItems(req))
  .trim()
  .notEmpty()
  .withMessage('Product is required.')
  .isLength({ max: 120 })
  .withMessage('Product must be 120 characters or fewer.');

const invoiceDateValidator = body('invoiceDate')
  .notEmpty()
  .withMessage('Invoice date is required.')
  .isISO8601()
  .withMessage('Invoice date must be a valid date.');

const legacyQuantityValidator = body('quantity')
  .if((value, { req }) => !hasItems(req))
  .notEmpty()
  .withMessage('Quantity is required.')
  .isFloat({ gt: 0 })
  .withMessage('Quantity must be greater than 0.')
  .toFloat();

const legacySellingPriceValidator = body('sellingPrice')
  .if((value, { req }) => !hasItems(req))
  .notEmpty()
  .withMessage('Selling price is required.')
  .isFloat({ min: 0 })
  .withMessage('Selling price must be 0 or greater.')
  .toFloat();

const paymentTypeValidator = body('paymentType')
  .notEmpty()
  .withMessage('Payment type is required.')
  .isIn(SALE_PAYMENT_TYPES)
  .withMessage('Payment type must be Cash or Credit.');

const paidAmountValidator = body('paidAmount')
  .optional({ values: 'falsy' })
  .isFloat({ min: 0 })
  .withMessage('Paid amount must be 0 or greater.')
  .toFloat();

const creditDaysValidator = body('creditDays')
  .if((value, { req }) => req.body.paymentType === 'Credit')
  .notEmpty()
  .withMessage('Credit days are required for credit sales.')
  .isInt({ gt: 0, max: 3650 })
  .withMessage('Credit days must be between 1 and 3650.')
  .toInt();

const optionalCreditDaysValidator = body('creditDays')
  .if((value, { req }) => req.body.paymentType !== 'Credit')
  .optional({ values: 'falsy' })
  .isInt({ min: 0, max: 3650 })
  .withMessage('Credit days must be between 0 and 3650.')
  .toInt();

const dueDateValidator = body('dueDate')
  .optional({ values: 'falsy' })
  .isISO8601()
  .withMessage('Due date must be a valid date.');

const parcelCountValidator = body('parcelCount')
  .optional({ values: 'falsy' })
  .isInt({ min: 0 })
  .withMessage('Parcel count must be 0 or greater.')
  .toInt();

const transportNameValidator = body('transportName')
  .optional({ values: 'falsy' })
  .trim()
  .isLength({ max: 120 })
  .withMessage('Transport name must be 120 characters or fewer.');

const vehicleNumberValidator = body('vehicleNumber')
  .optional({ values: 'falsy' })
  .trim()
  .toUpperCase()
  .isLength({ max: 30 })
  .withMessage('Vehicle number must be 30 characters or fewer.');

const notesValidator = body('notes')
  .optional()
  .trim()
  .isLength({ max: 1000 })
  .withMessage('Notes must be 1000 characters or fewer.');

const remarksValidator = body('remarks')
  .optional()
  .trim()
  .isLength({ max: 1000 })
  .withMessage('Remarks must be 1000 characters or fewer.');

const itemsValidator = body('items')
  .optional()
  .isArray({ min: 1 })
  .withMessage('Items must contain at least one sale item.');

const itemStockTypeValidator = body('items.*.stockType')
  .if((value, { req }) => hasItems(req))
  .isIn(SALE_STOCK_TYPES)
  .withMessage('Stock type must be rod, sheet, pu-product, or legacy-product.');

const itemStockRefValidator = body('items.*.stockRef')
  .if((value, { req }) => hasItems(req))
  .notEmpty()
  .withMessage('Stock reference is required.')
  .isMongoId()
  .withMessage('Stock reference must be a valid identifier.');

const itemQuantityValidator = body('items.*.quantity')
  .if((value, { req }) => hasItems(req))
  .isFloat({ gt: 0 })
  .withMessage('Item quantity must be greater than 0.')
  .toFloat();

const itemSellingPriceValidator = body('items.*.sellingPrice')
  .if((value, { req }) => hasItems(req))
  .isFloat({ min: 0 })
  .withMessage('Item selling price must be 0 or greater.')
  .toFloat();

const itemGstRateValidator = body('items.*.gstRate')
  .optional({ values: 'falsy' })
  .isFloat({ min: 0, max: 100 })
  .withMessage('GST rate must be between 0 and 100.')
  .toFloat();

const termsValidator = body('termsAndConditions')
  .optional()
  .isArray()
  .withMessage('Terms and conditions must be a list.');

export const createSaleValidator = [
  customerValidator,
  partyNameValidator,
  customerMobileValidator,
  customerAddressValidator,
  customerLocationValidator,
  customerGSTValidator,
  legacyProductValidator,
  invoiceDateValidator,
  legacyQuantityValidator,
  legacySellingPriceValidator,
  paymentTypeValidator,
  paidAmountValidator,
  creditDaysValidator,
  optionalCreditDaysValidator,
  dueDateValidator,
  parcelCountValidator,
  transportNameValidator,
  vehicleNumberValidator,
  notesValidator,
  remarksValidator,
  termsValidator,
  itemsValidator,
  itemStockTypeValidator,
  itemStockRefValidator,
  itemQuantityValidator,
  itemSellingPriceValidator,
  itemGstRateValidator,
];

export const updateSaleValidator = [...createSaleValidator];

export const cancelSaleValidator = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Cancellation reason is required.')
    .bail()
    .isLength({ max: 1000 })
    .withMessage('Cancellation reason must be 1000 characters or fewer.'),
];

export const recordSalePaymentValidator = [
  body('amount')
    .notEmpty()
    .withMessage('Payment amount is required.')
    .isFloat({ gt: 0 })
    .withMessage('Payment amount must be greater than 0.')
    .toFloat(),
  body('paymentDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Payment date must be a valid date.'),
  body('paymentType')
    .optional({ values: 'falsy' })
    .isIn(SALE_PAYMENT_TYPES)
    .withMessage('Payment type must be Cash or Credit.'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Payment notes must be 1000 characters or fewer.'),
];

export const listSaleValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50.')
    .toInt(),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Search must be 120 characters or fewer.'),
  query('paymentType')
    .optional({ values: 'falsy' })
    .isIn(SALE_PAYMENT_TYPES)
    .withMessage('Payment type must be Cash or Credit.'),
  query('paymentStatus')
    .optional({ values: 'falsy' })
    .isIn(SALE_INVOICE_STATUSES)
    .withMessage('Payment status must be Paid, Partially Paid, Unpaid, or Cancelled.'),
  query('invoiceStatus')
    .optional({ values: 'falsy' })
    .isIn(SALE_INVOICE_STATUSES)
    .withMessage('Invoice status must be Paid, Partially Paid, Unpaid, or Cancelled.'),
  query('invoiceNumber')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Invoice number filter must be 120 characters or fewer.'),
  query('customerName')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Customer name filter must be 120 characters or fewer.'),
  query('customerMobile')
    .optional()
    .trim()
    .isLength({ max: 40 })
    .withMessage('Customer mobile filter must be 40 characters or fewer.'),
  query('invoiceDateFrom')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Invoice date from must be a valid date.'),
  query('invoiceDateTo')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Invoice date to must be a valid date.'),
];

export const saleIdParamValidator = [
  param('saleId').isMongoId().withMessage('Sale id must be a valid identifier.'),
];
