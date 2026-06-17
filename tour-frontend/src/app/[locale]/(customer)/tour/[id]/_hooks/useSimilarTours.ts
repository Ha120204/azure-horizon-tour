'use client';

import { useEffect, useState } from 'react';
import { Tour } from '@/types';
import { API_BASE_URL } from '@/lib/http/constants';

/**
 * Lấy danh sách tour tương tự (client-side, non-critical cho SEO).
 * Ưu tiên cùng điểm đến; nếu không đủ kết quả thì fallback toàn bộ catalog.
 */
export function useSimilarTours(tour: Tour, language: string): Tour[] {
    const [similarTours, setSimilarTours] = useState<Tour[]>([]);

    useEffect(() => {
        let cancelled = false;

        const filterResult = (all: Tour[]) =>
            all.filter((t) => t.id !== tour.id && (t.availableSeats ?? 1) > 0).slice(0, 3);

        const baseParams = new URLSearchParams({
            limit: '5',
            locale: language,
            sortBy: 'ratingDesc',
        });
        if (tour.price > 0) {
            baseParams.set('minPrice', String(Math.round(tour.price * 0.4)));
            baseParams.set('maxPrice', String(Math.round(tour.price * 2.0)));
        }

        const fetchWithDest = tour.destination?.name
            ? fetch(`${API_BASE_URL}/tour?${new URLSearchParams({ ...Object.fromEntries(baseParams), dest: tour.destination.name }).toString()}`)
                  .then((res) => (res.ok ? res.json() : null))
            : Promise.resolve(null);

        fetchWithDest
            .then((json) => filterResult(json?.data ?? []))
            .then((results) => {
                if (!cancelled) setSimilarTours(results);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [tour.id, tour.destination?.name, tour.price, language]);

    return similarTours;
}
