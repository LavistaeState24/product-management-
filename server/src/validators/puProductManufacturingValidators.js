import { body, param, query } from 'express-validator';

const SELLING_UNITS = ['Per PCS', 'Per Kg'];

export const createPUProductManufacturingValidator = [
  body('puChemicalStockId')
    .notEmpty()
    .withMessage('PU chemical stock id is required.')
    .isMongoId()
    .withMessage('PU chemical stock id must be a valid identifier.'),
  body('chemicalQuantityKg')
    .notEmpty()
    .withMessage('Chemical quantity is required.')
    .isFloat({ gt: 0 })
    .withMessage('Chemical quantity must be greater than 0.')
    .toFloat(),
  body('mocaStockId')
    .notEmpty()
    .withMessage('MOCA stock id is required.')
    .isMongoId()
    .withMessage('MOCA stock id must be a valid identifier.'),
  body('mocaQuantityKg')
    .notEmpty()
    .withMessage('MOCA quantity is required.')
    .isFloat({ gt: 0 })
    .withMessage('MOCA quantity must be greater than 0.')
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

export const updatePUProductManufacturingValidator = [
  param('id').isMongoId().withMessage('Manufacturing batch id must be a valid identifier.'),
  ...createPUProductManufacturingValidator,
];

export const deletePUProductManufacturingValidator = [
  param('id').isMongoId().withMessage('Manufacturing batch id must be a valid identifier.'),
];

export const listPUProductManufacturingValidator = [
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

export const getPUProductManufacturingValidator = [
  param('id').isMongoId().withMessage('Manufacturing batch id must be a valid identifier.'),
];

export const listPUProductStockValidator = [...listPUProductManufacturingValidator];

export const searchPUProductStockValidator = [
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

export const getPUProductStockValidator = [
  param('id').isMongoId().withMessage('PU product stock id must be a valid identifier.'),
];
