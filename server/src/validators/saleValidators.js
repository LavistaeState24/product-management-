import { body, param, query } from 'express-validator';
import {
  calculateSaleAmounts,
  SALE_INVOICE_STATUSES,
  SALE_PAYMENT_TYPES,
} from '../utils/saleMath.js';

function calculateRawTotal(req) {
  return calculateSaleAmounts({
    quantity: req.body.quantity,
    sellingPrice: req.body.sellingPrice,
    paidAmount: req.body.paidAmount,
    paymentType: req.body.paymentType,
  }).totalAmount;
}

const customerValidator = body('customerName')
  .trim()
  .notEmpty()
  .withMessage('Customer is required.')
  .isLength({ max: 120 })
  .withMessage('Customer must be 120 characters or fewer.');

const productValidator = body('productName')
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

const quantityValidator = body('quantity')
  .notEmpty()
  .withMessage('Quantity is required.')
  .isFloat({ gt: 0 })
  .withMessage('Quantity must be greater than 0.')
  .toFloat();

const sellingPriceValidator = body('sellingPrice')
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
  .bail()
  .custom((value, { req }) => {
    if (Number(value) > calculateRawTotal(req)) {
      throw new Error('Paid amount cannot exceed total amount.');
    }

    return true;
  })
  .toFloat();

const notesValidator = body('notes')
  .optional()
  .trim()
  .isLength({ max: 1000 })
  .withMessage('Notes must be 1000 characters or fewer.');

export const createSaleValidator = [
  customerValidator,
  productValidator,
  invoiceDateValidator,
  quantityValidator,
  sellingPriceValidator,
  paymentTypeValidator,
  paidAmountValidator,
  notesValidator,
];

export const updateSaleValidator = [...createSaleValidator];

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
  query('invoiceStatus')
    .optional({ values: 'falsy' })
    .isIn(SALE_INVOICE_STATUSES)
    .withMessage('Invoice status must be Paid, Partially Paid, or Unpaid.'),
];

export const saleIdParamValidator = [
  param('saleId').isMongoId().withMessage('Sale id must be a valid identifier.'),
];
