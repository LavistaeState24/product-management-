import { body, param, query } from 'express-validator';
import { ALL_PERMISSIONS, ROLES } from '../utils/permissions.js';

const roleValues = Object.values(ROLES);
const permissionValues = new Set(ALL_PERMISSIONS);

const userIdParamValidator = param('userId')
  .isMongoId()
  .withMessage('User id must be a valid identifier.');

const nameValidator = body('name')
  .trim()
  .notEmpty()
  .withMessage('Name is required.')
  .isLength({ max: 120 })
  .withMessage('Name must be 120 characters or fewer.');

const optionalNameValidator = body('name')
  .optional()
  .trim()
  .notEmpty()
  .withMessage('Name cannot be empty.')
  .isLength({ max: 120 })
  .withMessage('Name must be 120 characters or fewer.');

const emailValidator = body('email')
  .trim()
  .notEmpty()
  .withMessage('Email is required.')
  .isEmail()
  .withMessage('Valid email is required.');

const optionalEmailValidator = body('email')
  .optional()
  .trim()
  .notEmpty()
  .withMessage('Email cannot be empty.')
  .isEmail()
  .withMessage('Valid email is required.');

const passwordValidator = body('password')
  .notEmpty()
  .withMessage('Password is required.')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters.');

const optionalPasswordValidator = body('password')
  .optional({ values: 'falsy' })
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters.');

const roleValidator = body('role')
  .optional()
  .isIn(roleValues)
  .withMessage(`Role must be one of ${roleValues.join(', ')}.`);

const permissionsValidator = body('permissions')
  .optional()
  .isArray()
  .withMessage('Permissions must be an array.')
  .bail()
  .custom((permissions) => {
    const unknownPermissions = permissions.filter(
      (permission) => !permissionValues.has(permission),
    );

    if (unknownPermissions.length) {
      throw new Error(`Unknown permissions: ${unknownPermissions.join(', ')}.`);
    }

    return true;
  });

const isActiveValidator = body('isActive')
  .optional()
  .isBoolean()
  .withMessage('Active status must be true or false.')
  .toBoolean();

export const userOptionsValidator = [];

export const listUsersValidator = [
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
  query('role')
    .optional()
    .isIn(roleValues)
    .withMessage(`Role must be one of ${roleValues.join(', ')}.`),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be true or false.')
    .toBoolean(),
];

export const getUserValidator = [userIdParamValidator];

export const createUserValidator = [
  nameValidator,
  emailValidator,
  passwordValidator,
  roleValidator,
  permissionsValidator,
  isActiveValidator,
];

export const updateUserValidator = [
  userIdParamValidator,
  optionalNameValidator,
  optionalEmailValidator,
  optionalPasswordValidator,
  roleValidator,
  permissionsValidator,
  isActiveValidator,
];

export const setUserActiveStatusValidator = [
  userIdParamValidator,
  body('isActive')
    .exists()
    .withMessage('Active status is required.')
    .bail()
    .isBoolean()
    .withMessage('Active status must be true or false.')
    .toBoolean(),
];

export const deleteUserValidator = [userIdParamValidator];
