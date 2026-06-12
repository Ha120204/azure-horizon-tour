'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/http/fetchWithAuth';
import { useAuth } from '@/hooks/useAuth';

export type LoadStatus = 'loading' | 'error' | 'ready';
export type DealCategory = 'all' | 'flash' | 'early' | 'lastminute';

export interface Voucher {
    id: number;
    code: string;
    label: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    minOrderValue: number;
    expiresAt: string;
    isDepleted: boolean;
}

export interface DealCard {
    id: number;
    departureId: number;
    tourId: number;
    name: string;
    image: string;
    badge: string;
    rating: number;
    duration: string;
    newPrice: number;
    oldPrice: number;
    discountPct: number;
    bookedPercent: number | null;   // null = no data (no maxSeats)
    maxSeats: number | null;
    availableSeats: number;
    flashSaleEndsAt: string | null; // ISO — for real per-card countdown
    category: DealCategory;
    destination: string;
}

interface SaleDealApi {
    id: number;
    tourId: number;
    name: string;
    image?: string | null;
    badge: string;
    rating?: number | null;
    duration: string;
    newPrice: number;
    oldPrice: number;
    discountPct?: number | null;
    bookedPercent?: number | null;
    maxSeats?: number | null;
    availableSeats?: number | null;
    flashSaleEndsAt?: string | null;
    category: DealCategory;
    destination?: string | null;
}

interface UserVoucher {
    voucherId: number;
}

export type SaveResult =
    | { ok: true }
    | { ok: false; reason: 'login' }
    | { ok: false; reason: 'error'; message?: string };

const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800';

export function usePromotions(language: string) {
    const { isLoggedIn } = useAuth();

    // ── Deals ─────────────────────
    const [deals, setDeals] = useState<DealCard[]>([]);
    const [dealsStatus, setDealsStatus] = useState<LoadStatus>('loading');

    const reloadDeals = useCallback(async () => {
        setDealsStatus('loading');
        const res = await api.get<SaleDealApi[]>(`/tour/sale-deals?locale=${language}`, { silent: true });
        if (!res.ok) {
            setDealsStatus('error');
            return;
        }
        const arr = Array.isArray(res.data) ? res.data : [];
        setDeals(arr.map((d) => ({
            id: d.id,
            departureId: d.id,
            tourId: d.tourId,
            name: d.name,
            image: d.image || FALLBACK_IMAGE,
            badge: d.badge,
            rating: d.rating ?? 0,
            duration: d.duration,
            newPrice: d.newPrice,
            oldPrice: d.oldPrice,
            discountPct: d.discountPct ?? 0,
            bookedPercent: d.bookedPercent ?? null,
            maxSeats: d.maxSeats ?? null,
            availableSeats: d.availableSeats ?? 0,
            flashSaleEndsAt: d.flashSaleEndsAt ?? null,
            category: d.category as DealCategory,
            destination: d.destination ?? '',
        })));
        setDealsStatus('ready');
    }, [language]);

    // Fetch dữ liệu khi mount; reloadDeals chủ động set trạng thái 'loading' (chủ ý).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { reloadDeals(); }, [reloadDeals]);

    // ── Vouchers + wallet ─────────
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [vouchersStatus, setVouchersStatus] = useState<LoadStatus>('loading');
    const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

    const reloadVouchers = useCallback(async () => {
        setVouchersStatus('loading');
        const res = await api.get<Voucher[]>('/voucher', { silent: true });
        if (!res.ok) {
            setVouchersStatus('error');
            return;
        }
        setVouchers(Array.isArray(res.data) ? res.data : []);
        setVouchersStatus('ready');
    }, []);

    // Fetch dữ liệu khi mount; reloadVouchers chủ động set trạng thái 'loading' (chủ ý).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { reloadVouchers(); }, [reloadVouchers]);

    // Synchronous localStorage check — no /auth/profile round-trip
    const loggedIn = isLoggedIn();

    useEffect(() => {
        // Fetch user's saved vouchers (only when logged in)
        if (!loggedIn) return;
        let active = true;
        api.get<UserVoucher[]>('/voucher/my-wallet', { silent: true }).then((res) => {
            if (!active || !res.ok) return;
            const arr = Array.isArray(res.data) ? res.data : [];
            setSavedIds(new Set(arr.map((uv) => uv.voucherId)));
        });
        return () => { active = false; };
    }, [loggedIn]);

    const saveToWallet = useCallback(async (voucherId: number): Promise<SaveResult> => {
        if (!isLoggedIn()) return { ok: false, reason: 'login' };

        const res = await api.post('/voucher/save', { voucherId }, { silent: true });
        if (res.ok) {
            setSavedIds((prev) => new Set([...prev, voucherId]));
            return { ok: true };
        }
        return { ok: false, reason: 'error', message: res.error };
    }, [isLoggedIn]);

    return {
        deals,
        dealsStatus,
        reloadDeals,
        vouchers,
        vouchersStatus,
        reloadVouchers,
        savedIds,
        saveToWallet,
    };
}
