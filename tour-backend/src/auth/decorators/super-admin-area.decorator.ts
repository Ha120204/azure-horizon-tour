import { SetMetadata } from '@nestjs/common';

// Các khu vận hành mà SUPER_ADMIN có thể tự bật để xem (read-only).
// Rỗng = chỉ thấy 4 quyền governance (quản lý admin, tổng quan, audit, cài đặt).
export const SUPER_ADMIN_AREAS = [
  'statistics',
  'tours',
  'bookings',
  'customers',
  'vouchers',
  'marketing',
  'articles',
  'reviews',
  'support',
] as const;

export type SuperAdminArea = (typeof SUPER_ADMIN_AREAS)[number];

export const SUPER_ADMIN_AREA_KEY = 'superAdminArea';

export const SuperAdminArea = (area: SuperAdminArea) =>
  SetMetadata(SUPER_ADMIN_AREA_KEY, area);

type GrantRequest = {
  method?: string;
  user?: { role?: unknown; superAdminViewGrants?: unknown };
};

// SUPER_ADMIN chỉ được XEM (GET) khu vận hành đã tự bật quyền. Mọi write đều bị chặn.
export function superAdminCanAccessArea(
  req: GrantRequest,
  area: SuperAdminArea,
): boolean {
  const grants = Array.isArray(req.user?.superAdminViewGrants)
    ? (req.user.superAdminViewGrants as string[])
    : [];
  return req.method === 'GET' && grants.includes(area);
}
