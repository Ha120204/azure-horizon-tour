'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/routing';
import { API_BASE_URL } from '@/lib/http/constants';

export type TravelScope = '' | 'DOMESTIC' | 'INTERNATIONAL';

export interface DestinationOption {
    id: number;
    name: string;
    imageUrl?: string | null;
    region?: string | null;
    travelScope?: Exclude<TravelScope, ''>;
    countryCode?: string | null;
}

export interface TourListItem {
    id: number;
    name: string;
    price: number;
    imageUrl?: string | null;
    duration?: string | null;
    averageRating?: number | null;
    reviewCount?: number | null;
    _count?: {
        reviews?: number;
    };
    departures?: { price?: number | null }[];
    [key: string]: unknown;
}

interface AppliedFilters {
    travelScope: TravelScope;
    dest: string;
    date: string;
    sidebarBudget: string;
    selectedRating: number;
    selectedTypes: string[];
    departure: string;
}

const normalizeTravelScope = (value: string | null): TravelScope =>
    value === 'DOMESTIC' || value === 'INTERNATIONAL' ? value : '';

/**
 * Quản lý toàn bộ state + data-fetching của trang điểm đến:
 * bộ lọc nháp (form), bộ lọc đã áp dụng, danh sách tour, phân trang,
 * danh sách điểm đến cho gợi ý, và các giá trị dẫn xuất (đếm bộ lọc, cờ loading).
 */
export function useDestinationTours(language: string) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // 1. Tham số khởi tạo từ URL (trang chủ truyền sang, hoặc lần lọc trước khi back/refresh)
    const initialDest = searchParams.get('dest') || '';
    const initialDate = searchParams.get('date') || '';
    const initialBudget = searchParams.get('budget') || '';
    const initialTravelScope = normalizeTravelScope(searchParams.get('travelScope'));
    const initialAllDestinations = searchParams.get('allDestinations') === '1' && !initialDest;
    const initialDeparture = searchParams.get('departure') || '';
    const initialRating = Number(searchParams.get('rating')) || 0;
    const initialTypes = (searchParams.get('types') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const initialSort = searchParams.get('sort') || 'recommended';
    const parsedPage = parseInt(searchParams.get('page') || '1', 10);
    const initialPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const parsedLimit = parseInt(searchParams.get('limit') || '12', 10);
    const initialLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 12;

    // 2. State thanh tìm kiếm
    const [dest, setDest] = useState(initialDest);
    const [isAllDestinationsSelected, setIsAllDestinationsSelected] = useState(initialAllDestinations);
    const [date, setDate] = useState(initialDate);
    const [travelScope, setTravelScope] = useState<TravelScope>(initialTravelScope);

    // 3. State dữ liệu API
    const [filteredTours, setFilteredTours] = useState<TourListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadedTours, setHasLoadedTours] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [resultRevision, setResultRevision] = useState(0);

    // 4. State bộ lọc sidebar
    const [sidebarBudget, setSidebarBudget] = useState(initialBudget);
    const [selectedRating, setSelectedRating] = useState<number>(initialRating);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes);
    const [departure, setDeparture] = useState(initialDeparture);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
        travelScope: initialTravelScope,
        dest: initialDest,
        date: initialDate,
        sidebarBudget: initialBudget,
        selectedRating: initialRating,
        selectedTypes: initialTypes,
        departure: initialDeparture,
    });
    const [showMobileFilter, setShowMobileFilter] = useState(false);
    const [sortBy, setSortBy] = useState(initialSort);

    // 4b. Dynamic data
    const [allDestinations, setAllDestinations] = useState<DestinationOption[]>([]);

    // 5. Phân trang
    const [page, setPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit, setLimit] = useState(initialLimit);

    const buildQueryString = () => {
        const query = new URLSearchParams();
        if (appliedFilters.travelScope) query.append('travelScope', appliedFilters.travelScope);
        if (appliedFilters.dest) query.append('dest', appliedFilters.dest);
        if (appliedFilters.date) query.append('date', appliedFilters.date);
        if (appliedFilters.sidebarBudget && appliedFilters.sidebarBudget !== 'unlimited') {
            const parts = appliedFilters.sidebarBudget.split('-');
            if (parts.length === 2) {
                query.append('minPrice', parts[0]);
                query.append('maxPrice', parts[1]);
            } else {
                query.append('minPrice', appliedFilters.sidebarBudget);
            }
        }
        if (appliedFilters.selectedRating > 0) {
            query.append('minRating', appliedFilters.selectedRating.toString());
        }
        if (appliedFilters.selectedTypes.length > 0) {
            query.append('types', appliedFilters.selectedTypes.join(','));
        }
        if (appliedFilters.departure) {
            query.append('departure', appliedFilters.departure);
        }
        query.append('sortBy', sortBy);
        query.append('page', page.toString());
        query.append('limit', limit.toString());
        query.append('locale', language);
        return query.toString();
    };
    const queryString = buildQueryString();

    // 6. Gọi API lấy Tour
    useEffect(() => {
        const controller = new AbortController();
        const fetchTours = async () => {
            setIsLoading(true);
            setHasError(false);
            try {
                const res = await fetch(`${API_BASE_URL}/tour?${queryString}`, { signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (json.data) {
                    setFilteredTours(json.data);
                    setTotalPages(json.meta?.totalPages || 1);
                    setTotalItems(json.meta?.totalItems || 0);
                } else {
                    setFilteredTours(Array.isArray(json) ? json : []);
                    setTotalItems(Array.isArray(json) ? json.length : 0);
                }
                setResultRevision((revision) => revision + 1);
                setHasLoadedTours(true);
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    console.error('Lỗi lấy danh sách tour:', error);
                    setHasError(true);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };
        fetchTours();
        return () => controller.abort();
    }, [queryString, reloadKey]);

    // 6b. Fetch destinations khi mount / đổi scope, locale
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const destinationParams = new URLSearchParams({ locale: language });
                if (travelScope) destinationParams.set('travelScope', travelScope);
                const destUrl = `${API_BASE_URL}/search/destinations?${destinationParams.toString()}`;
                const destRes = await fetch(destUrl);
                const destJson = await destRes.json();
                setAllDestinations(destJson.data || destJson);
            } catch (error) {
                console.error('Lỗi fetch danh sách điểm đến:', error);
            }
        };
        fetchFilterData();
    }, [travelScope, language]);

    // 6c. Sync URL → state khi điều hướng từ bên ngoài (ví dụ: Header search push sang trang này).
    // So trực tiếp giá trị URL với bộ lọc ĐANG áp dụng:
    //  - Khác nhau → điều hướng từ ngoài vào → đồng bộ + refetch.
    //  - Trùng nhau (do effect 6d tự ghi URL) → bỏ qua → không lặp vô hạn.
    // Cách này thay cho guard so-khớp-chuỗi cũ vốn dễ bỏ sót khi đang ở sẵn trang này.
    useEffect(() => {
        const urlDest = searchParams.get('dest') || '';
        const urlTravelScope = normalizeTravelScope(searchParams.get('travelScope'));
        const urlDate = searchParams.get('date') || '';
        const urlBudget = searchParams.get('budget') || '';
        const urlRating = Number(searchParams.get('rating')) || 0;
        const urlTypes = (searchParams.get('types') || '').split(',').map((s) => s.trim()).filter(Boolean);
        const urlDeparture = searchParams.get('departure') || '';
        const urlSort = searchParams.get('sort') || 'recommended';
        const parsedPage = parseInt(searchParams.get('page') || '1', 10);
        const urlPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        const parsedLimit = parseInt(searchParams.get('limit') || '12', 10);
        const urlLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 12;

        const sameAsApplied =
            urlDest === appliedFilters.dest &&
            urlTravelScope === appliedFilters.travelScope &&
            urlDate === appliedFilters.date &&
            urlBudget === appliedFilters.sidebarBudget &&
            urlRating === appliedFilters.selectedRating &&
            urlDeparture === appliedFilters.departure &&
            urlTypes.length === appliedFilters.selectedTypes.length &&
            urlTypes.every((type) => appliedFilters.selectedTypes.includes(type)) &&
            urlSort === sortBy &&
            urlPage === page &&
            urlLimit === limit;
        if (sameAsApplied) return;

        setDest(urlDest);
        setIsAllDestinationsSelected(searchParams.get('allDestinations') === '1' && !urlDest);
        setTravelScope(urlTravelScope);
        setDate(urlDate);
        setSidebarBudget(urlBudget);
        setSelectedRating(urlRating);
        setSelectedTypes(urlTypes);
        setDeparture(urlDeparture);
        setSortBy(urlSort);
        setPage(urlPage);
        setLimit(urlLimit);
        setAppliedFilters({
            travelScope: urlTravelScope,
            dest: urlDest,
            date: urlDate,
            sidebarBudget: urlBudget,
            selectedRating: urlRating,
            selectedTypes: urlTypes,
            departure: urlDeparture,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, appliedFilters, sortBy, page, limit]);

    // 6d. Đồng bộ bộ lọc đã áp dụng + sort + trang lên URL
    // → back từ trang chi tiết / F5 / chia sẻ link đều giữ nguyên trạng thái lọc
    useEffect(() => {
        const params = new URLSearchParams();
        if (appliedFilters.travelScope) params.set('travelScope', appliedFilters.travelScope);
        if (appliedFilters.dest) params.set('dest', appliedFilters.dest);
        if (appliedFilters.date) params.set('date', appliedFilters.date);
        if (appliedFilters.sidebarBudget) params.set('budget', appliedFilters.sidebarBudget);
        if (appliedFilters.selectedRating > 0) params.set('rating', String(appliedFilters.selectedRating));
        if (appliedFilters.selectedTypes.length > 0) params.set('types', appliedFilters.selectedTypes.join(','));
        if (appliedFilters.departure) params.set('departure', appliedFilters.departure);
        if (sortBy !== 'recommended') params.set('sort', sortBy);
        if (page > 1) params.set('page', String(page));
        if (limit !== 12) params.set('limit', String(limit));
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appliedFilters, sortBy, page, limit]);

    // 7. Rating threshold (single-select, 0 = no filter)
    const setRating = (rating: number) => {
        setSelectedRating(rating);
    };

    // 8. Toggle tour type
    const toggleType = (type: string) => {
        setSelectedTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
        );
    };

    // 9. Xóa tất cả — reset cả input lẫn appliedFilters để refetch ngay
    const handleClearAll = () => {
        setTravelScope('');
        setDest('');
        setIsAllDestinationsSelected(false);
        setDate('');
        setSidebarBudget('');
        setSelectedRating(0);
        setSelectedTypes([]);
        setDeparture('');
        setAppliedFilters({
            travelScope: '',
            dest: '',
            date: '',
            sidebarBudget: '',
            selectedRating: 0,
            selectedTypes: [],
            departure: '',
        });
        setPage(1);
    };

    // 10. Áp dụng bộ lọc sidebar
    const handleApplyFilters = () => {
        setAppliedFilters({
            travelScope,
            dest,
            date,
            sidebarBudget,
            selectedRating,
            selectedTypes,
            departure,
        });
        setPage(1);
        setShowMobileFilter(false);
    };

    // Bộ lọc đang chọn trong form (state nhập) — dùng cho header sidebar
    const activeFilterCount =
        (selectedRating > 0 ? 1 : 0) + selectedTypes.length + (sidebarBudget ? 1 : 0) +
        (dest ? 1 : 0) + (date ? 1 : 0) + (travelScope ? 1 : 0) + (departure ? 1 : 0);
    // Bộ lọc thực sự đang áp dụng lên kết quả — dùng cho các badge mô tả kết quả
    const appliedFilterCount =
        (appliedFilters.selectedRating > 0 ? 1 : 0) + appliedFilters.selectedTypes.length +
        (appliedFilters.sidebarBudget ? 1 : 0) + (appliedFilters.dest ? 1 : 0) +
        (appliedFilters.date ? 1 : 0) + (appliedFilters.travelScope ? 1 : 0) +
        (appliedFilters.departure ? 1 : 0);
    // Có thay đổi trong form chưa bấm "Áp dụng" → state nhập lệch với appliedFilters
    const hasPendingChanges =
        travelScope !== appliedFilters.travelScope ||
        dest !== appliedFilters.dest ||
        date !== appliedFilters.date ||
        sidebarBudget !== appliedFilters.sidebarBudget ||
        selectedRating !== appliedFilters.selectedRating ||
        departure !== appliedFilters.departure ||
        selectedTypes.length !== appliedFilters.selectedTypes.length ||
        selectedTypes.some((type) => !appliedFilters.selectedTypes.includes(type));

    const showInitialLoading = isLoading && !hasLoadedTours;
    const showRefetchOverlay = isLoading && hasLoadedTours;

    return {
        // Bộ lọc nháp (form)
        dest, setDest,
        isAllDestinationsSelected, setIsAllDestinationsSelected,
        date, setDate,
        travelScope, setTravelScope,
        sidebarBudget, setSidebarBudget,
        selectedRating, setRating,
        selectedTypes, toggleType,
        departure, setDeparture,
        // UI / sort / phân trang
        sortBy, setSortBy,
        showMobileFilter, setShowMobileFilter,
        page, setPage,
        totalPages,
        totalItems,
        limit, setLimit,
        // Dữ liệu
        filteredTours,
        allDestinations,
        resultRevision,
        // Trạng thái
        hasError,
        showInitialLoading,
        showRefetchOverlay,
        retry: () => setReloadKey((key) => key + 1),
        // Dẫn xuất
        activeFilterCount,
        appliedFilterCount,
        hasPendingChanges,
        // Hành động
        handleClearAll,
        handleApplyFilters,
    };
}
