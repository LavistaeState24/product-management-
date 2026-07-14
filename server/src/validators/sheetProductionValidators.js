import { body, param, query } from 'express-validator';

const listPaginationValidators = [
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

const sheetProductionPayloadValidators = [
  body('rawMaterialStockId')
    .notEmpty()
    .withMessage('Raw material stock id is required.')
    .isMongoId()
    .withMessage('Raw material stock id must be a valid identifier.'),
  body('quantityUsed')
    .notEmpty()
    .withMessage('Quantity used is required.')
    .isFloat({ gt: 0 })
    .withMessage('Quantity used must be greater than 0.')
    .toFloat(),
  body('dateTime')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Date time must be a valid date.'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks must be 1000 characters or fewer.'),
  body('sheets')
    .isArray({ min: 1 })
    .withMessage('At least one sheet item is required.'),
  body('sheets.*.itemNumber')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Sheet item number must be 80 characters or fewer.'),
  body('sheets.*.itemName')
    .trim()
    .notEmpty()
    .withMessage('Sheet item name is required.')
    .isLength({ max: 120 })
    .withMessage('Sheet item name must be 120 characters or fewer.'),
  body('sheets.*.size')
    .trim()
    .notEmpty()
    .withMessage('Sheet size is required.')
    .isLength({ max: 80 })
    .withMessage('Sheet size must be 80 characters or fewer.'),
  body('sheets.*.colour')
    .trim()
    .notEmpty()
    .withMessage('Sheet colour is required.')
    .isLength({ max: 80 })
    .withMessage('Sheet colour must be 80 characters or fewer.'),
  body('sheets.*.weight')
    .notEmpty()
    .withMessage('Sheet weight is required.')
    .isFloat({ gt: 0 })
    .withMessage('Sheet weight must be greater than 0.')
    .toFloat(),
  body('sheets.*.quantity')
    .notEmpty()
    .withMessage('Sheet quantity is required.')
    .isInt({ min: 1 })
    .withMessage('Sheet quantity must be at least 1.')
    .toInt(),
];

export const createSheetProductionValidator = [...sheetProductionPayloadValidators];

export const updateSheetProductionValidator = [
  param('id').isMongoId().withMessage('Sheet production id must be a valid identifier.'),
  ...sheetProductionPayloadValidators,
];

export const deleteSheetProductionValidator = [
  param('id').isMongoId().withMessage('Sheet production id must be a valid identifier.'),
];

export const getSheetProductionValidator = [
  param('id').isMongoId().withMessage('Sheet production id must be a valid identifier.'),
];

export const getSheetStockValidator = [
  param('id').isMongoId().withMessage('Sheet stock id must be a valid identifier.'),
];

export const listSheetProductionValidator = [
  ...listPaginationValidators,
  query('search')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Search must be 120 characters or fewer.'),
];

export const listSheetStockValidator = [...listSheetProductionValidator];

export const searchSheetStockValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.')
    .toInt(),
  query('q')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Search must be 120 characters or fewer.'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Search must be 120 characters or fewer.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100.')
    .toInt(),
];
