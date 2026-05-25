/**
 * App-wide role constants.
 * Sync với UserRole enum trong Prisma schema.
 */
export const APP_ROLES = {
  CUSTOMER: 'CUSTOMER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ADMIN_ROLES: readonly AppRole[] = [APP_ROLES.ADMIN, APP_ROLES.SUPER_ADMIN];
export const STAFF_AND_ABOVE: readonly AppRole[] = [APP_ROLES.STAFF, APP_ROLES.ADMIN, APP_ROLES.SUPER_ADMIN];

/**
 * Pagination defaults.
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;
