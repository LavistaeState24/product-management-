import { body, param } from 'express-validator';
import mongoose from 'mongoose';
import { ORDER_STOCK_TYPES } from '../models/Order.js';

export const orderIdParamValidator = [
  param('orderId')
    .isMongoId()
    .withMessage('Order id must be a valid identifier.'),
];

export const notificationIdParamValidator = [
  param('notificationId')
    .isMongoId()
    .withMessage('Notification id must be a valid identifier.'),
];

export const messageLogIdParamValidator = [
  param('messageLogId')
    .isMongoId()
    .withMessage('Message log id must be a valid identifier.'),
];

export const createOrderValidator = [
  body('clientName')
    .trim()
    .notEmpty()
    .withMessage('Client name is required.')
    .isLength({ max: 120 })
    .withMessage('Client name must be 120 characters or fewer.'),
  body('clientMobile')
    .trim()
    .notEmpty()
    .withMessage('Client mobile is required.')
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Client mobile must be a valid phone number.'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one order item is required.'),
  body('items.*.itemDesc')
    .trim()
    .notEmpty()
    .withMessage('Item description is required.')
    .isLength({ max: 240 })
    .withMessage('Item description must be 240 characters or fewer.'),
  body('items.*.size')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Size must be 80 characters or fewer.'),
  body('items.*.colour')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Colour must be 80 characters or fewer.'),
  body('items.*.hardness')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Hardness must be 80 characters or fewer.'),
  body('items.*.quantity')
    .isFloat({ gt: 0 })
    .withMessage('Quantity must be greater than zero.')
    .toFloat(),
  body('items.*.rate')
    .isFloat({ min: 0 })
    .withMessage('Rate cannot be negative.')
    .toFloat(),
  body('items.*.stockType')
    .optional({ values: 'falsy' })
    .isIn(ORDER_STOCK_TYPES)
    .withMessage(`Stock type must be one of ${ORDER_STOCK_TYPES.join(', ')}.`),
  body('items').custom((items) => {
    items.forEach((item, index) => {
      const stockType = item.stockType || 'manual';

      if (
        stockType !== 'manual' &&
        !mongoose.Types.ObjectId.isValid(item.stockRef)
      ) {
        throw new Error(
          `Item ${index + 1}: Stock reference must be a valid identifier.`,
        );
      }
    });

    return true;
  }),
  body('remarks')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks must be 1000 characters or fewer.'),
];

export const acceptOrderValidator = [
  ...orderIdParamValidator,
  body('readyDays')
    .isInt({ min: 1 })
    .withMessage('Ready days must be a positive integer.')
    .toInt(),
];

export const progressOrderValidator = [
  ...orderIdParamValidator,
  body('note')
    .trim()
    .notEmpty()
    .withMessage('Progress note is required.')
    .isLength({ max: 1000 })
    .withMessage('Progress note must be 1000 characters or fewer.'),
];

export const markOrderReadyValidator = [
  ...orderIdParamValidator,
  ...orderItemsWithItemNumbersValidator(),
];

export const assignOrderItemNumbersValidator = [
  ...orderIdParamValidator,
  ...orderItemsWithItemNumbersValidator(),
];

function orderItemsWithItemNumbersValidator() {
  return [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Every order item must be submitted with an item number.'),
    body('items.*.itemNo')
      .trim()
      .notEmpty()
      .withMessage('Every item needs an item number before Ready.')
      .isLength({ max: 120 })
      .withMessage('Item number must be 120 characters or fewer.'),
    body('items.*.stockType')
      .optional({ values: 'falsy' })
      .isIn(ORDER_STOCK_TYPES)
      .withMessage(
        `Stock type must be one of ${ORDER_STOCK_TYPES.join(', ')}.`,
      ),
    body('items').custom((items) => {
      items.forEach((item, index) => {
        const stockType = item.stockType || 'manual';

        if (
          stockType !== 'manual' &&
          !mongoose.Types.ObjectId.isValid(item.stockRef)
        ) {
          throw new Error(
            `Item ${index + 1}: Stock reference must be a valid identifier.`,
          );
        }
      });

      return true;
    }),
  ];
}

