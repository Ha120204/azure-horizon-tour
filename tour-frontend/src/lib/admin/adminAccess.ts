export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';

// Khu vận hành SUPER_ADMIN có thể tự bật để xem (read-only). Đồng bộ với backend SUPER_ADMIN_AREAS.
export type SuperAdminArea =
  | 'statistics'
  | 'tours'
  | 'bookings'
  | 'customers'
  | 'vouchers'
  | 'marketing'
  | 'articles'
  | 'reviews'
  | 'support';

export const SUPER_ADMIN_AREAS: SuperAdminArea[] = [
  'statistics',
  'tours',
  'bookings',
  'customers',
  'vouchers',
  'marketing',
  'articles',
  'reviews',
  'support',
];

const ADMIN_AREA_BY_PATH: { path: string; area: SuperAdminArea }[] = [
  { path: '/admin/statistics', area: 'statistics' },
  { path: '/admin/tours', area: 'tours' },
  { path: '/admin/bookings', area: 'bookings' },
  { path: '/admin/customers', area: 'customers' },
  { path: '/admin/vouchers', area: 'vouchers' },
  { path: '/admin/marketing', area: 'marketing' },
  { path: '/admin/articles', area: 'articles' },
  { path: '/admin/reviews', area: 'reviews' },
  { path: '/admin/support', area: 'support' },
];

export const ALL_ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];
export const ADMIN_AND_SUPER_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN'];
export const SUPER_ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN'];

type AdminRouteAccess = {
  path: string;
  roles: AdminRole[];
  exact?: boolean;
};

const ADMIN_ROUTE_ACCESS: AdminRouteAccess[] = [
  { path: '/admin/super', roles: SUPER_ADMIN_ROLES },
  { path: '/admin/statistics', roles: ADMIN_AND_SUPER_ROLES },
  { path: '/admin/customers', roles: ALL_ADMIN_ROLES },
  { path: '/admin/reviews', roles: ADMIN_AND_SUPER_ROLES },
  { path: '/admin/marketing', roles: ADMIN_AND_SUPER_ROLES },
  { path: '/admin/logs', roles: ADMIN_AND_SUPER_ROLES },
  { path: '/admin/settings', roles: ADMIN_AND_SUPER_ROLES },
  { path: '/admin/staffs', roles: ADMIN_AND_SUPER_ROLES },
  { path: '/admin/tours', roles: ALL_ADMIN_ROLES },
  { path: '/admin/bookings', roles: ALL_ADMIN_ROLES },
  { path: '/admin/vouchers', roles: ALL_ADMIN_ROLES },
  { path: '/admin/articles', roles: ALL_ADMIN_ROLES },
  { path: '/admin/support', roles: ALL_ADMIN_ROLES },
  { path: '/admin/profile', roles: ALL_ADMIN_ROLES },
  // Dashboard vận hành — không phải quyền governance, nên SUPER_ADMIN không vào (về /admin/super)
  { path: '/admin', roles: ['ADMIN', 'STAFF'], exact: true },
];

export function getCleanAdminPath(pathname?: string | null) {
  return pathname?.replace(/^\/(en|vi)(?=\/|$)/, '') || '';
}

export function isAdminRole(role: unknown): role is AdminRole {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'STAFF';
}

export function canAccessRole(userRole: unknown, roles: readonly AdminRole[]) {
  return isAdminRole(userRole) && roles.includes(userRole);
}

export function getAreaForPath(pathname?: string | null): SuperAdminArea | undefined {
  const cleanPath = getCleanAdminPath(pathname);
  return ADMIN_AREA_BY_PATH.find(
    (item) => cleanPath === item.path || cleanPath.startsWith(`${item.path}/`),
  )?.area;
}

// SUPER_ADMIN chỉ xem được khu vận hành đã tự bật. Các khu governance không có area → luôn cho phép.
export function canSuperAdminAccessArea(
  area: SuperAdminArea | undefined,
  grants: readonly string[] | undefined,
): boolean {
  if (!area) return true;
  return Array.isArray(grants) && grants.includes(area);
}

export function getAllowedAdminRolesForPath(pathname?: string | null) {
  const cleanPath = getCleanAdminPath(pathname);
  const route = ADMIN_ROUTE_ACCESS.find((item) => {
    if (item.exact) return cleanPath === item.path;
    return cleanPath === item.path || cleanPath.startsWith(`${item.path}/`);
  });

  return route?.roles ?? ALL_ADMIN_ROLES;
}

export function canAccessAdminPath(
  pathname: string | null | undefined,
  role: unknown,
  grants?: readonly string[],
) {
  if (!canAccessRole(role, getAllowedAdminRolesForPath(pathname))) return false;
  if (role === 'SUPER_ADMIN') {
    return canSuperAdminAccessArea(getAreaForPath(pathname), grants);
  }
  return true;
}

export function getDefaultAdminPathForRole(role: AdminRole) {
  const defaultPaths: Record<AdminRole, string> = {
    SUPER_ADMIN: '/admin/super',
    ADMIN: '/admin',
    STAFF: '/admin',
  };

  return defaultPaths[role];
}
