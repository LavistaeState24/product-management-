import { query } from 'express-validator';

const FINISHED_GOODS_TYPES = ['rod', 'sheet', 'rod-product', 'sheet-product', 'pu-product'];
const SORT_FIELDS = [
  'itemNumber',
  'productName',
  'size',
  'colour',
  'weight',
  'quantity',
  'productionDate',
  'stockType',
];

export const listFinishedGoodsStockValidator = [
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
  query('q')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Search must be 120 characters or fewer.'),
  query('type')
    .optional({ values: 'falsy' })
    .isIn(FINISHED_GOODS_TYPES)
    .withMessage('Type must be rod, sheet, rod-product, sheet-product, or pu-product.'),
  query('sortBy')
    .optional({ values: 'falsy' })
    .isIn(SORT_FIELDS)
    .withMessage('Sort field is not supported.'),
  query('sortOrder')
    .optional({ values: 'falsy' })
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc.'),
];
