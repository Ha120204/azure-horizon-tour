export const ADMIN_REALTIME_NOTIFICATION_EVENT = 'admin:realtime-notification';

export type AdminRealtimeNotification = {
  id?: number | string;
  type: string;
  resourceType: string;
  resourceId?: string | null;
  title?: string;
  body?: string;
  href?: string | null;
  severity?: string;
  createdAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseAdminRealtimeNotification(value: unknown): AdminRealtimeNotification | null {
  const payload = typeof value === 'string' ? safeParseJson(value) : value;
  if (!isRecord(payload)) return null;

  const type = payload.type;
  const resourceType = payload.resourceType;
  if (typeof type !== 'string' || typeof resourceType !== 'string') {
    return null;
  }

  return {
    id: typeof payload.id === 'number' || typeof payload.id === 'string' ? payload.id : undefined,
    type,
    resourceType,
    resourceId: typeof payload.resourceId === 'string' ? payload.resourceId : null,
    title: typeof payload.title === 'string' ? payload.title : undefined,
    body: typeof payload.body === 'string' ? payload.body : undefined,
    href: typeof payload.href === 'string' ? payload.href : null,
    severity: typeof payload.severity === 'string' ? payload.severity : undefined,
    createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : undefined,
  };
}

export function dispatchAdminRealtimeNotification(detail: AdminRealtimeNotification) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(ADMIN_REALTIME_NOTIFICATION_EVENT, { detail }));
}

export function isAdminRealtimeNotificationEvent(
  event: Event,
): event is CustomEvent<AdminRealtimeNotification> {
  return event.type === ADMIN_REALTIME_NOTIFICATION_EVENT && isRecord((event as CustomEvent).detail);
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
