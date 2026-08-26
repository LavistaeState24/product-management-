import { body, param, query } from 'express-validator';

const SELLING_UNITS = ['Per PCS', 'Per Kg'];

export const createSheetProductManufacturingValidator = [
  body('sheetStockId')
    .notEmpty()
    .withMessage('Sheet stock id is required.')
    .isMongoId()
    .withMessage('Sheet stock id must be a valid identifier.'),
  body('quantityUsed')
    .notEmpty()
    .withMessage('Quantity used is required.')
    .isFloat({ gt: 0 })
    .withMessage('Quantity used must be greater than 0.')
    .toFloat(),
  body('productName')
    .trim()
    .notEmpty()
    .withMessage('Product name is required.')
    .isLength({ max: 120 })
    .withMessage('Product name must be 120 characters or fewer.'),
  body('size')
    .trim()
    .notEmpty()
    .withMessage('Size is required.')
    .isLength({ max: 80 })
    .withMessage('Size must be 80 characters or fewer.'),
  body('colour')
    .trim()
    .notEmpty()
    .withMessage('Colour is required.')
    .isLength({ max: 80 })
    .withMessage('Colour must be 80 characters or fewer.'),
  body('sellingUnit')
    .notEmpty()
    .withMessage('Selling unit is required.')
    .isIn(SELLING_UNITS)
    .withMessage('Selling unit must be Per PCS or Per Kg.'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required.')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1.')
    .toInt(),
  body('itemNumber')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Item number must be 80 characters or fewer.'),
  body('dateTime')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Date time must be a valid date.'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks must be 1000 characters or fewer.'),
];

export const listSheetProductManufacturingValidator = [
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
  query('search')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Search must be 120 characters or fewer.'),
];

export const getSheetProductManufacturingValidator = [
  param('id').isMongoId().withMessage('Manufacturing batch id must be a valid identifier.'),
];

export const listSheetProductStockValidator = [...listSheetProductManufacturingValidator];

export const searchSheetProductStockValidator = [
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

export const getSheetProductStockValidator = [
  param('id').isMongoId().withMessage('Sheet product stock id must be a valid identifier.'),
];
