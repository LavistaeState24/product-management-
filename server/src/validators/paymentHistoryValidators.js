import { body, param, query } from 'express-validator';

export const paymentReferenceTypeValidator = query('referenceType')
  .optional({ values: 'falsy' })
  .isIn(['Purchase', 'Sale'])
  .withMessage('Reference type must be Purchase or Sale.');

export const recordPaymentValidator = [
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
  body('paymentMethod')
    .customSanitizer((value, { req }) => value ?? req.body.paymentType ?? 'Cash')
    .isIn(['Cash', 'Cheque'])
    .withMessage('Payment method must be Cash or Cheque.'),
  body('chequeNumber')
    .if((value, { req }) => (req.body.paymentMethod ?? req.body.paymentType) === 'Cheque')
    .trim()
    .notEmpty()
    .withMessage('Cheque number is required for cheque payments.')
    .isLength({ max: 60 })
    .withMessage('Cheque number must be 60 characters or fewer.'),
  body('chequeDate')
    .if((value, { req }) => (req.body.paymentMethod ?? req.body.paymentType) === 'Cheque')
    .notEmpty()
    .withMessage('Cheque date is required for cheque payments.')
    .isISO8601()
    .withMessage('Cheque date must be a valid date.'),
  body('bankName')
    .if((value, { req }) => (req.body.paymentMethod ?? req.body.paymentType) === 'Cheque')
    .trim()
    .notEmpty()
    .withMessage('Bank name is required for cheque payments.')
    .isLength({ max: 120 })
    .withMessage('Bank name must be 120 characters or fewer.'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks must be 1000 characters or fewer.'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be 1000 characters or fewer.'),
];

export const listPaymentHistoryValidator = [
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
  paymentReferenceTypeValidator,
  query('referenceId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('Reference id must be a valid identifier.'),
  query('invoiceNumber')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Invoice number filter must be 120 characters or fewer.'),
];

export const listPaymentManagementValidator = [
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
];

export const purchasePaymentParamValidator = [
  param('purchaseId').isMongoId().withMessage('Purchase id must be a valid identifier.'),
];

export const salePaymentParamValidator = [
  param('saleId').isMongoId().withMessage('Sale id must be a valid identifier.'),
];

export const paymentHistoryReferenceParamValidator = [
  param('referenceId').isMongoId().withMessage('Reference id must be a valid identifier.'),
];
