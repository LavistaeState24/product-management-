import { body, query } from 'express-validator';

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

export const createRodProductionValidator = [
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
  body('rods')
    .isArray({ min: 1 })
    .withMessage('At least one rod item is required.'),
  body('rods.*.item')
    .trim()
    .notEmpty()
    .withMessage('Rod item is required.')
    .isLength({ max: 120 })
    .withMessage('Rod item must be 120 characters or fewer.'),
  body('rods.*.size')
    .trim()
    .notEmpty()
    .withMessage('Rod size is required.')
    .isLength({ max: 80 })
    .withMessage('Rod size must be 80 characters or fewer.'),
  body('rods.*.weightKg')
    .notEmpty()
    .withMessage('Rod weight is required.')
    .isFloat({ gt: 0 })
    .withMessage('Rod weight must be greater than 0.')
    .toFloat(),
  body('rods.*.colour')
    .trim()
    .notEmpty()
    .withMessage('Rod colour is required.')
    .isLength({ max: 80 })
    .withMessage('Rod colour must be 80 characters or fewer.'),
  body('rods.*.quantity')
    .notEmpty()
    .withMessage('Rod quantity is required.')
    .isInt({ min: 1 })
    .withMessage('Rod quantity must be at least 1.')
    .toInt(),
  body('rods.*.isManualItemNumber')
    .optional({ values: 'falsy' })
    .isBoolean()
    .withMessage('Manual item number flag must be true or false.'),
  body('rods.*.itemNumber')
    .trim()
    .notEmpty()
    .withMessage('Rod item number is required.')
    .isLength({ max: 80 })
    .withMessage('Rod item number must be 80 characters or fewer.'),
];

export const listRodProductionValidator = [
  ...listPaginationValidators,
  query('search')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Search must be 120 characters or fewer.'),
];

export const listRodStockValidator = [...listRodProductionValidator];

export const searchRodStockValidator = [
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
