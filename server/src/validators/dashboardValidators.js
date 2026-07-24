import { query } from 'express-validator';

export const DASHBOARD_PERIODS = ['this-month', 'last-3-months', 'last-6-months', 'this-year'];

export const dashboardQueryValidator = [
  query('period')
    .optional({ values: 'falsy' })
    .isIn(DASHBOARD_PERIODS)
    .withMessage('Period must be this-month, last-3-months, last-6-months, or this-year.'),
];
