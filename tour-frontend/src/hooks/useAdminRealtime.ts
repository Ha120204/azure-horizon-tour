'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  ADMIN_REALTIME_NOTIFICATION_EVENT,
  isAdminRealtimeNotificationEvent,
  type AdminRealtimeNotification,
} from '@/lib/adminRealtimeEvents';

type UseAdminRealtimeOptions = {
  enabled?: boolean;
  resourceTypes?: readonly string[];
  notificationTypes?: readonly string[];
  minRefreshMs?: number;
  pause?: boolean;
  onRefresh: (detail: AdminRealtimeNotification) => void | Promise<unknown>;
  onError?: (error: unknown) => void;
  shouldRefresh?: (detail: AdminRealtimeNotification) => boolean;
};

const DEFAULT_MIN_REFRESH_MS = 1500;

export function useAdminRealtime({
  enabled = true,
  resourceTypes,
  notificationTypes,
  minRefreshMs = DEFAULT_MIN_REFRESH_MS,
  pause = false,
  onRefresh,
  onError,
  shouldRefresh,
}: UseAdminRealtimeOptions) {
  const refreshRef = useRef(onRefresh);
  const errorRef = useRef(onError);
  const shouldRefreshRef = useRef(shouldRefresh);
  const runningRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  const resourceTypeSet = useMemo(
    () => new Set(resourceTypes ?? []),
    [resourceTypes],
  );
  const notificationTypeSet = useMemo(
    () => new Set(notificationTypes ?? []),
    [notificationTypes],
  );

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    errorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    shouldRefreshRef.current = shouldRefresh;
  }, [shouldRefresh]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleRealtimeNotification = (event: Event) => {
      if (!isAdminRealtimeNotificationEvent(event)) return;
      if (pause || document.visibilityState !== 'visible' || runningRef.current) return;

      const detail = event.detail;
      if (resourceTypeSet.size > 0 && !resourceTypeSet.has(detail.resourceType)) return;
      if (notificationTypeSet.size > 0 && !notificationTypeSet.has(detail.type)) return;
      if (shouldRefreshRef.current && !shouldRefreshRef.current(detail)) return;

      const now = Date.now();
      if (now - lastRefreshAtRef.current < minRefreshMs) return;

      runningRef.current = true;
      lastRefreshAtRef.current = now;
      Promise.resolve(refreshRef.current(detail))
        .catch((error: unknown) => {
          errorRef.current?.(error);
        })
        .finally(() => {
          runningRef.current = false;
        });
    };

    window.addEventListener(ADMIN_REALTIME_NOTIFICATION_EVENT, handleRealtimeNotification);

    return () => {
      window.removeEventListener(ADMIN_REALTIME_NOTIFICATION_EVENT, handleRealtimeNotification);
    };
  }, [enabled, minRefreshMs, notificationTypeSet, pause, resourceTypeSet]);
}
