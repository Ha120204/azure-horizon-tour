export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';

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
  { path: '/admin', roles: ALL_ADMIN_ROLES, exact: true },
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

export function getAllowedAdminRolesForPath(pathname?: string | null) {
  const cleanPath = getCleanAdminPath(pathname);
  const route = ADMIN_ROUTE_ACCESS.find((item) => {
    if (item.exact) return cleanPath === item.path;
    return cleanPath === item.path || cleanPath.startsWith(`${item.path}/`);
  });

  return route?.roles ?? ALL_ADMIN_ROLES;
}

export function canAccessAdminPath(pathname: string | null | undefined, role: unknown) {
  return canAccessRole(role, getAllowedAdminRolesForPath(pathname));
}

export function getDefaultAdminPathForRole(role: AdminRole) {
  const defaultPaths: Record<AdminRole, string> = {
    SUPER_ADMIN: '/admin',
    ADMIN: '/admin',
    STAFF: '/admin',
  };

  return defaultPaths[role];
}
