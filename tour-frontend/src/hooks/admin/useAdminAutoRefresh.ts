'use client';

import { useEffect, useRef } from 'react';

interface UseAdminAutoRefreshOptions {
  enabled?: boolean;
  intervalMs: number;
  minFocusRefreshMs?: number;
  pause?: boolean;
  onRefresh: () => void | Promise<unknown>;
  onError?: (error: unknown) => void;
}

export function useAdminAutoRefresh({
  enabled = true,
  intervalMs,
  minFocusRefreshMs = 5_000,
  pause = false,
  onRefresh,
  onError,
}: UseAdminAutoRefreshOptions) {
  const refreshRef = useRef(onRefresh);
  const errorRef = useRef(onError);
  const runningRef = useRef(false);
  const lastRunAtRef = useRef(0);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    errorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const canRefresh = () =>
      !pause && typeof document !== 'undefined' && document.visibilityState === 'visible';

    const runRefresh = async (reason: 'focus' | 'interval') => {
      if (!canRefresh() || runningRef.current) return;

      const now = Date.now();
      const minGap = reason === 'focus' ? minFocusRefreshMs : Math.min(intervalMs, 5_000);
      if (now - lastRunAtRef.current < minGap) return;

      runningRef.current = true;
      lastRunAtRef.current = now;
      try {
        await refreshRef.current();
      } catch (error) {
        errorRef.current?.(error);
      } finally {
        runningRef.current = false;
      }
    };

    const handleFocus = () => {
      void runRefresh('focus');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void runRefresh('focus');
    };

    const intervalId = window.setInterval(() => {
      void runRefresh('interval');
    }, intervalMs);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, minFocusRefreshMs, pause]);
}
