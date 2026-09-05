import {
  body,
  param,
  query,
} from 'express-validator';

import {
  calculatePurchaseAmounts,
  PURCHASE_GST_RATES,
  PURCHASE_GST_TYPES,
  PURCHASE_PAYMENT_TYPES,
} from '../utils/purchaseMath.js';

const PURCHASE_TYPES = [
  'Raw Material',
  'PU Chemical',
  'Mocha Chemical',
];

const PURCHASE_UNITS = [
  'Kg',
  'PCS',
];

const GST_NUMBER_PATTERN =
  /^[0-9A-Z]{15}$/;

function calculateRawTotal(req) {
  const quantity =
    Number(req.body.quantity);

  const purchasePrice =
    Number(
      req.body.pricePerUnit ??
        req.body.purchasePrice,
    );

  const gstRate =
    Number(req.body.gstRate);

  const paidAmount =
    req.body.paidAmount === '' ||
    req.body.paidAmount == null
      ? 0
      : Number(req.body.paidAmount);

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(
      purchasePrice,
    ) ||
    purchasePrice < 0 ||
    !Number.isFinite(gstRate) ||
    !Number.isFinite(paidAmount)
  ) {
    return null;
  }

  const result =
    calculatePurchaseAmounts({
      quantity,
      purchasePrice,
      gstType:
        req.body.gstType,
      gstRate,
      paymentType:
        req.body.paymentType,
      paidAmount,
    });

  return Number.isFinite(
    result?.totalAmount,
  )
    ? result.totalAmount
    : null;
}

const supplierValidator =
  body('supplierName')
    .trim()
    .notEmpty()
    .withMessage(
      'Supplier name is required.',
    )
    .bail()
    .isLength({
      max: 120,
    })
    .withMessage(
      'Supplier name must be 120 characters or fewer.',
    );

const purchaseTypeValidator =
  body('purchaseType')
    .default('Raw Material')
    .isIn(PURCHASE_TYPES)
    .withMessage(
      'Purchase type must be Raw Material, PU Chemical, or Mocha Chemical.',
    );

const itemValidator =
  body('itemName')
    .customSanitizer(
      (value, { req }) =>
        value ??
        req.body.productName,
    )
    .trim()
    .notEmpty()
    .withMessage(
      'Item name is required.',
    )
    .bail()
    .isLength({
      max: 120,
    })
    .withMessage(
      'Item name must be 120 characters or fewer.',
    );

const unitValidator =
  body('unit')
    .notEmpty()
    .withMessage(
      'Unit is required.',
    )
    .bail()
    .isIn(PURCHASE_UNITS)
    .withMessage(
      'Unit must be Kg or PCS.',
    );

const purchaseDateValidator =
  body('purchaseDate')
    .notEmpty()
    .withMessage(
      'Purchase date is required.',
    )
    .bail()
    .isISO8601({
      strict: true,
    })
    .withMessage(
      'Purchase date must be a valid date.',
    )
    .toDate();

const quantityValidator =
  body('quantity')
    .notEmpty()
    .withMessage(
      'Quantity is required.',
    )
    .bail()
    .isFloat({
      gt: 0,
    })
    .withMessage(
      'Quantity must be greater than 0.',
    )
    .toFloat();

const pricePerUnitValidator =
  body('pricePerUnit')
    .customSanitizer(
      (value, { req }) =>
        value ??
        req.body.purchasePrice,
    )
    .notEmpty()
    .withMessage(
      'Price per unit is required.',
    )
    .bail()
    .isFloat({
      min: 0,
    })
    .withMessage(
      'Price per unit must be 0 or greater.',
    )
    .toFloat();

const supplierAddressValidator =
  body('supplierAddress')
    .trim()
    .notEmpty()
    .withMessage(
      'Address is required.',
    )
    .bail()
    .isLength({
      max: 240,
    })
    .withMessage(
      'Address must be 240 characters or fewer.',
    );

const supplierLocationValidator =
  body('supplierLocation')
    .trim()
    .notEmpty()
    .withMessage(
      'Location is required.',
    )
    .bail()
    .isLength({
      max: 120,
    })
    .withMessage(
      'Location must be 120 characters or fewer.',
    );

const gstNoValidator =
  body('gstNo')
    .customSanitizer((value) =>
      String(value || '')
        .replace(/\s+/g, '')
        .trim()
        .toUpperCase(),
    )
    .notEmpty()
    .withMessage(
      'GST number is required.',
    )
    .bail()
    .matches(
      GST_NUMBER_PATTERN,
    )
    .withMessage(
      'GST number must contain exactly 15 uppercase letters or numbers.',
    );

const gstTypeValidator =
  body('gstType')
    .notEmpty()
    .withMessage(
      'GST type is required.',
    )
    .bail()
    .isIn(
      PURCHASE_GST_TYPES,
    )
    .withMessage(
      'GST type must be None, CGST_SGST, or IGST.',
    );

const gstRateValidator =
  body('gstRate')
    .notEmpty()
    .withMessage(
      'GST rate is required.',
    )
    .bail()
    .custom((value) =>
      PURCHASE_GST_RATES.includes(
        Number(value),
      ),
    )
    .withMessage(
      `GST rate must be one of ${PURCHASE_GST_RATES.join(
        ', ',
      )}.`,
    )
    .bail()
    .custom(
      (value, { req }) => {
        if (
          req.body.gstType ===
            'None' &&
          Number(value) !== 0
        ) {
          throw new Error(
            'GST rate must be 0 when GST type is None.',
          );
        }

        return true;
      },
    )
    .toFloat();

const paymentTypeValidator =
  body('paymentType')
    .notEmpty()
    .withMessage(
      'Payment type is required.',
    )
    .bail()
    .isIn(
      PURCHASE_PAYMENT_TYPES,
    )
    .withMessage(
      'Payment type must be Cash, Cheque, Credit, or Advance.',
    );

const dueDateValidator =
  body('dueDate')
    .customSanitizer(
      (value, { req }) => {
        const resolvedValue =
          value ??
          req.body
            .creditDueDate;

        if (
          resolvedValue === '' ||
          resolvedValue == null
        ) {
          return null;
        }

        return resolvedValue;
      },
    )
    .custom(
      (value, { req }) => {
        const paymentType =
          req.body.paymentType;

        const requiresDueDate =
          paymentType ===
            'Credit' ||
          paymentType ===
            'Advance';

        if (
          requiresDueDate &&
          !value
        ) {
          throw new Error(
            'Due date is required for credit or advance purchases.',
          );
        }

        if (
          !requiresDueDate &&
          value
        ) {
          throw new Error(
            'Due date is only allowed for credit or advance purchases.',
          );
        }

        if (
          value &&
          Number.isNaN(
            Date.parse(value),
          )
        ) {
          throw new Error(
            'Due date must be a valid date.',
          );
        }

        return true;
      },
    )
    .customSanitizer(
      (value) =>
        value
          ? new Date(value)
          : null,
    );

const paidAmountValidator =
  body('paidAmount')
    .customSanitizer(
      (value) =>
        value === '' ||
        value == null
          ? 0
          : value,
    )
    .isFloat({
      min: 0,
    })
    .withMessage(
      'Paid amount must be 0 or greater.',
    )
    .bail()
    .custom(
      (value, { req }) => {
        const totalAmount =
          calculateRawTotal(req);

        if (
          totalAmount == null
        ) {
          return true;
        }

        if (
          Number(value) >
          totalAmount
        ) {
          throw new Error(
            'Paid amount cannot exceed total amount.',
          );
        }

        const paymentType =
          req.body.paymentType;

        if (
          (paymentType ===
            'Cash' ||
            paymentType ===
              'Cheque') &&
          Number(value) !==
            totalAmount
        ) {
          throw new Error(
            `${paymentType} purchases must be fully paid.`,
          );
        }

        return true;
      },
    )
    .toFloat();

const notesValidator =
  body('notes')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage(
      'Notes must be 1000 characters or fewer.',
    );

const remarksValidator =
  body('remarks')
    .customSanitizer(
      (value, { req }) =>
        value ??
        req.body.notes,
    )
    .trim()
    .notEmpty()
    .withMessage(
      'Remarks are required.',
    )
    .bail()
    .isLength({
      max: 1000,
    })
    .withMessage(
      'Remarks must be 1000 characters or fewer.',
    );

const removeBillValidator =
  body('removeBill')
    .optional({
      nullable: true,
    })
    .isBoolean()
    .withMessage(
      'Remove bill must be true or false.',
    )
    .toBoolean();

export const createPurchaseValidator =
  [
    supplierValidator,
    supplierAddressValidator,
    supplierLocationValidator,
    gstNoValidator,
    purchaseTypeValidator,
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

export const updatePurchaseValidator =
  [
    ...createPurchaseValidator,
  ];

export const listPurchaseValidator =
  [
    query('page')
      .optional()
      .isInt({
        min: 1,
      })
      .withMessage(
        'Page must be a positive integer.',
      )
      .toInt(),

    query('limit')
      .optional()
      .isInt({
        min: 1,
        max: 50,
      })
      .withMessage(
        'Limit must be between 1 and 50.',
      )
      .toInt(),

    query('search')
      .optional()
      .trim()
      .isLength({
        max: 120,
      })
      .withMessage(
        'Search must be 120 characters or fewer.',
      ),

    query('paymentType')
      .optional({
        values: 'falsy',
      })
      .isIn(
        PURCHASE_PAYMENT_TYPES,
      )
      .withMessage(
        'Payment type must be Cash, Cheque, Credit, or Advance.',
      ),

    query('purchaseType')
      .optional({
        values: 'falsy',
      })
      .isIn(
        PURCHASE_TYPES,
      )
      .withMessage(
        'Purchase type must be Raw Material, PU Chemical, or Mocha Chemical.',
      ),

    query('fromDate')
      .optional({
        values: 'falsy',
      })
      .isISO8601({
        strict: true,
      })
      .withMessage(
        'From date must be a valid date.',
      )
      .toDate(),

    query('toDate')
      .optional({
        values: 'falsy',
      })
      .isISO8601({
        strict: true,
      })
      .withMessage(
        'To date must be a valid date.',
      )
      .toDate(),

    query()
      .custom((value) => {
        if (
          value.fromDate &&
          value.toDate &&
          new Date(
            value.fromDate,
          ) >
            new Date(
              value.toDate,
            )
        ) {
          throw new Error(
            'From date cannot be after to date.',
          );
        }

        return true;
      }),
  ];

export const purchaseIdParamValidator =
  [
    param('purchaseId')
      .isMongoId()
      .withMessage(
        'Purchase id must be a valid identifier.',
      ),
  ];