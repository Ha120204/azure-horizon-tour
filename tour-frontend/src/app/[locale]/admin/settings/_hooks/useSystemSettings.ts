'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { PANEL_META } from '../_lib/config';
import { canEdit, formatDuration } from '../_lib/helpers';
import type { GroupedSettings, SettingsPanel, SystemHealth } from '../_lib/types';

const resolveSettingsPanel = (value: string | null): SettingsPanel =>
    value && Object.prototype.hasOwnProperty.call(PANEL_META, value) ? value as SettingsPanel : 'company';

export function useSystemSettings() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [grouped, setGrouped] = useState<GroupedSettings>({});
    const [userRole, setUserRole] = useState('');
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());
    const activePanel = resolveSettingsPanel(searchParams.get('tab'));

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const [settingsRes, profileRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/settings`),
                fetchWithAuth(`${API_BASE_URL}/auth/profile`),
            ]);
            if (settingsRes.ok) {
                const json = await settingsRes.json();
                setGrouped(json.data ?? {});
            }
            if (profileRes.ok) {
                const json = await profileRes.json();
                const role = json.role ?? json.data?.role ?? '';
                setUserRole(role);
            }
        } catch {
            // Keep the settings shell usable; individual sections will show empty states.
        } finally {
            setLoading(false);
        }
    }, []);

    const checkSystemHealth = useCallback(async () => {
        const t0 = performance.now();
        setHealthLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/settings/health`, { signal: AbortSignal.timeout(5000) });
            const latencyMs = Math.round(performance.now() - t0);
            if (!res.ok) throw new Error('Health check failed');
            const json = await res.json();
            const data = (json.data ?? json) as SystemHealth;
            setHealth({
                ...data,
                items: [
                    {
                        key: 'frontend_api',
                        label: 'Frontend → Backend API',
                        status: latencyMs > 500 ? 'warning' : 'ok',
                        latencyMs,
                        message: 'Trình duyệt gọi /settings/health thành công.',
                    },
                    ...(data.items ?? []),
                ],
            });
            return true;
        } catch {
            setHealth({
                checkedAt: new Date().toISOString(),
                items: [{
                    key: 'frontend_api',
                    label: 'Frontend → Backend API',
                    status: 'error',
                    message: 'Không gọi được /settings/health. Kiểm tra backend, token đăng nhập hoặc CORS.',
                }],
            });
            return false;
        } finally {
            setHealthLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); checkSystemHealth(); }, [fetchSettings, checkSystemHealth]);

    useAdminAutoRefresh({
        intervalMs: 5 * 60 * 1000,
        onRefresh: checkSystemHealth,
    });

    const setActivePanel = useCallback((panel: SettingsPanel) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', panel);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [pathname, router, searchParams]);

    const handleManualHealthCheck = useCallback(async () => {
        setActivePanel('runtime');
        const ok = await checkSystemHealth();
        showToast(
            ok ? 'Đã cập nhật trạng thái hệ thống.' : 'Không kiểm tra được trạng thái hệ thống. Hãy restart backend nếu vừa cập nhật code.',
            ok ? 'success' : 'error',
        );
    }, [checkSystemHealth, setActivePanel, showToast]);

    const handleSave = useCallback(async (updates: Record<string, string>) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) {
                const error = await res.json().catch(() => null);
                const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
                throw new Error(message || 'Lưu thất bại. Vui lòng thử lại.');
            }
            showToast('Đã lưu cài đặt thành công!');
            fetchSettings();
            return true;
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Lưu thất bại. Vui lòng thử lại.', 'error');
            return false;
        }
    }, [fetchSettings, showToast]);

    const editable = canEdit(userRole);
    const visiblePanels = (Object.keys(PANEL_META) as SettingsPanel[])
        .filter(panel => PANEL_META[panel].kind === 'info' || (grouped[panel]?.length ?? 0) > 0);
    const activeMeta = PANEL_META[activePanel];
    const runtimeRows = useMemo(() => [
        { icon: 'api', label: 'Backend API URL', value: API_BASE_URL, mono: true },
        { icon: 'schedule', label: 'Thời gian trình duyệt', value: now.toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'medium' }), mono: true, hint: 'Không phải thời gian server; dùng để đối chiếu phiên làm việc hiện tại' },
        { icon: 'timer', label: 'Backend uptime', value: formatDuration(health?.uptimeSeconds), hint: 'Thời gian tiến trình backend đã chạy tại thời điểm health check gần nhất' },
        { icon: 'language', label: 'Framework', value: 'NestJS 10 · Node.js · TypeScript' },
        { icon: 'storage', label: 'ORM / Database', value: 'Prisma ORM · PostgreSQL' },
    ], [health?.uptimeSeconds, now]);

    return {
        grouped,
        userRole,
        health,
        healthLoading,
        toast,
        loading,
        now,
        activePanel,
        activeMeta,
        editable,
        visiblePanels,
        runtimeRows,
        setActivePanel,
        handleManualHealthCheck,
        handleSave,
    };
}
