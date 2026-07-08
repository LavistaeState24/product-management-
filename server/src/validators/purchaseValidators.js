import { body, param, query } from 'express-validator';
import {
  calculatePurchaseAmounts,
  PURCHASE_GST_RATES,
  PURCHASE_GST_TYPES,
  PURCHASE_PAYMENT_TYPES,
} from '../utils/purchaseMath.js';

function calculateRawTotal(req) {
  return calculatePurchaseAmounts({
    quantity: req.body.quantity,
    purchasePrice: req.body.pricePerUnit ?? req.body.purchasePrice,
    gstType: req.body.gstType,
    gstRate: req.body.gstRate,
    paymentType: req.body.paymentType,
    paidAmount: req.body.paidAmount,
  }).totalAmount;
}

const supplierValidator = body('supplierName')
  .trim()
  .notEmpty()
  .withMessage('Supplier name is required.')
  .isLength({ max: 120 })
  .withMessage('Supplier name must be 120 characters or fewer.');

const itemValidator = body('itemName')
  .customSanitizer((value, { req }) => value ?? req.body.productName)
  .trim()
  .notEmpty()
  .withMessage('Item name is required.')
  .isLength({ max: 120 })
  .withMessage('Item name must be 120 characters or fewer.');

const unitValidator = body('unit')
  .notEmpty()
  .withMessage('Unit is required.')
  .isIn(['Kg', 'PCS'])
  .withMessage('Unit must be Kg or PCS.');

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

const pricePerUnitValidator = body('pricePerUnit')
  .customSanitizer((value, { req }) => value ?? req.body.purchasePrice)
  .notEmpty()
  .withMessage('Price per unit is required.')
  .isFloat({ min: 0 })
  .withMessage('Price per unit must be 0 or greater.')
  .toFloat();

const supplierAddressValidator = body('supplierAddress')
  .trim()
  .notEmpty()
  .withMessage('Address is required.')
  .isLength({ max: 240 })
  .withMessage('Address must be 240 characters or fewer.');

const supplierLocationValidator = body('supplierLocation')
  .trim()
  .notEmpty()
  .withMessage('Location is required.')
  .isLength({ max: 120 })
  .withMessage('Location must be 120 characters or fewer.');

const gstNoValidator = body('gstNo')
  .trim()
  .notEmpty()
  .withMessage('GST number is required.')
  .isLength({ max: 40 })
  .withMessage('GST number must be 40 characters or fewer.');

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
  .isIn(PURCHASE_PAYMENT_TYPES)
  .withMessage('Payment type must be Cash, Cheque, Credit, or Advance.');

const dueDateValidator = body('dueDate')
  .customSanitizer((value, { req }) => value ?? req.body.creditDueDate)
  .custom((value, { req }) => {
  const paymentType = req.body.paymentType;
  const normalizedValue = value;

  if (paymentType === 'Credit' || paymentType === 'Advance') {
    if (!normalizedValue) {
      throw new Error('Due date is required for credit or advance purchases.');
    }

    const isValidDate = !Number.isNaN(Date.parse(normalizedValue));

    if (!isValidDate) {
      throw new Error('Due date must be a valid date.');
    }
  }

  if ((paymentType === 'Cash' || paymentType === 'Cheque') && normalizedValue) {
    throw new Error('Due date is only allowed for credit or advance purchases.');
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

const remarksValidator = body('remarks')
  .customSanitizer((value, { req }) => value ?? req.body.notes)
  .trim()
  .notEmpty()
  .withMessage('Remarks are required.')
  .isLength({ max: 1000 })
  .withMessage('Remarks must be 1000 characters or fewer.');

const removeBillValidator = body('removeBill')
  .optional({ values: 'falsy' })
  .isBoolean()
  .withMessage('Remove bill must be true or false.');

export const createPurchaseValidator = [
  supplierValidator,
  supplierAddressValidator,
  supplierLocationValidator,
  gstNoValidator,
  itemValidator,
  unitValidator,
  purchaseDateValidator,
  quantityValidator,
  pricePerUnitValidator,
  gstTypeValidator,
  gstRateValidator,
  paymentTypeValidator,
  dueDateValidator,
  paidAmountValidator,
  remarksValidator,
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
    .isIn(PURCHASE_PAYMENT_TYPES)
    .withMessage('Payment type must be Cash, Cheque, Credit, or Advance.'),
];

export const purchaseIdParamValidator = [
  param('purchaseId').isMongoId().withMessage('Purchase id must be a valid identifier.'),
];
