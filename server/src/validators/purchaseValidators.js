import { body, param, query } from 'express-validator';
import {
  calculatePurchaseAmounts,
  PURCHASE_GST_RATES,
  PURCHASE_GST_TYPES,
} from '../utils/purchaseMath.js';

function calculateRawTotal(req) {
  return calculatePurchaseAmounts({
    quantity: req.body.quantity,
    purchasePrice: req.body.purchasePrice,
    gstType: req.body.gstType,
    gstRate: req.body.gstRate,
    paymentType: req.body.paymentType,
    paidAmount: req.body.paidAmount,
  }).totalAmount;
}

const supplierValidator = body('supplierName')
  .trim()
  .notEmpty()
  .withMessage('Supplier is required.')
  .isLength({ max: 120 })
  .withMessage('Supplier must be 120 characters or fewer.');

const productValidator = body('productName')
  .trim()
  .notEmpty()
  .withMessage('Product is required.')
  .isLength({ max: 120 })
  .withMessage('Product must be 120 characters or fewer.');

const purchaseDateValidator = body('purchaseDate')
  .notEmpty()
  .withMessage('Purchase date is required.')
  .isISO8601()
  .withMessage('Purchase date must be a valid date.');

const quantityValidator = body('quantity')
  .notEmpty()
  .withMessage('Quantity is required.')
  .isFloat({ gt: 0 })
  .withMessage('Quantity must be greater than 0.')
  .toFloat();

const purchasePriceValidator = body('purchasePrice')
  .notEmpty()
  .withMessage('Purchase price is required.')
  .isFloat({ min: 0 })
  .withMessage('Purchase price must be 0 or greater.')
  .toFloat();

const gstTypeValidator = body('gstType')
  .notEmpty()
  .withMessage('GST type is required.')
  .isIn(PURCHASE_GST_TYPES)
  .withMessage('GST type must be None, CGST_SGST, or IGST.');

const gstRateValidator = body('gstRate')
  .notEmpty()
  .withMessage('GST rate is required.')
  .bail()
  .custom((value) => PURCHASE_GST_RATES.includes(Number(value)))
  .withMessage(`GST rate must be one of ${PURCHASE_GST_RATES.join(', ')}.`)
  .bail()
  .custom((value, { req }) => {
    if (req.body.gstType === 'None' && Number(value) !== 0) {
      throw new Error('GST rate must be 0 when GST type is None.');
    }

    return true;
  })
  .toFloat();

const paymentTypeValidator = body('paymentType')
  .notEmpty()
  .withMessage('Payment type is required.')
  .isIn(['Cash', 'Credit'])
  .withMessage('Payment type must be Cash or Credit.');

const creditDueDateValidator = body('creditDueDate').custom((value, { req }) => {
  if (req.body.paymentType === 'Credit') {
    if (!value) {
      throw new Error('Credit due date is required for credit purchases.');
    }

    const isValidDate = !Number.isNaN(Date.parse(value));

    if (!isValidDate) {
      throw new Error('Credit due date must be a valid date.');
    }
  }

  if (req.body.paymentType === 'Cash' && value) {
    throw new Error('Credit due date is only allowed for credit purchases.');
  }

  return true;
});

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

const removeBillValidator = body('removeBill')
  .optional({ values: 'falsy' })
  .isBoolean()
  .withMessage('Remove bill must be true or false.');

export const createPurchaseValidator = [
  supplierValidator,
  productValidator,
  purchaseDateValidator,
  quantityValidator,
  purchasePriceValidator,
  gstTypeValidator,
  gstRateValidator,
  paymentTypeValidator,
  creditDueDateValidator,
  paidAmountValidator,
  notesValidator,
  removeBillValidator,
];

export const updatePurchaseValidator = [...createPurchaseValidator];

export const listPurchaseValidator = [
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
    .isIn(['Cash', 'Credit'])
    .withMessage('Payment type must be Cash or Credit.'),
];

export const purchaseIdParamValidator = [
  param('purchaseId').isMongoId().withMessage('Purchase id must be a valid identifier.'),
];
