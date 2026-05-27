'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type {
    TravelScope, Destination, TourPackage, TourDeparture, TourFormData,
    SaleCategory, ExistingTourPackage, ExistingTourDeparture,
    TourFormModalProps,
} from './tourForm/types';
import {
    EMPTY_FORM, DRAFT_DESTINATION_NAME, MIN_START_DATE, isBookableDepartureDate,
    UI_TO_API_DEPARTURE_CATEGORY, toUiDepartureCategory,
    TOUR_TYPES, DURATION_PRESETS, DEPARTURE_POINTS, PACKAGE_NAMES,
} from './tourForm/constants';
import { TagChipField, INCLUDE_PRESETS, EXCLUDE_PRESETS } from './tourForm/TagChipField';


// ── Component ──────────────────────────────────────────────────────────
export default function TourFormModal({
    mode, initialData, destinations: initialDestinations,
    userRole = '', onSuccess, onClose, onDestinationCreated,
}: TourFormModalProps) {
    const isStaff = userRole === 'STAFF';
    const isAdminLike = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const [form, setForm] = useState<TourFormData>(EMPTY_FORM);
    const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [errors, setErrors] = useState<Partial<TourFormData>>({});
    const [globalError, setGlobalError] = useState('');
    const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Gallery state
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<{ id: number; url: string }[]>([]);
    const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Package state
    const [packages, setPackages] = useState<TourPackage[]>([]);
    const EMPTY_PKG: TourPackage = { name: '', nameEn: '', nameMode: 'select', description: '', descriptionEn: '', price: '', badge: '', includes: [], includesEn: [], excludes: [], excludesEn: [] };

    // Departure state
    const [departures, setDepartures] = useState<TourDeparture[]>([]);
    const EMPTY_DEP: TourDeparture = { departureDate: '', price: '', availableSeats: '', maxSeats: '', note: '', noteEn: '', category: 'all', flashSaleEndsAt: '' };

    // Confirm-close dialog state
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Destination creation state
    const [showNewDest, setShowNewDest] = useState(false);
    const [newDestName, setNewDestName] = useState('');
    const [newDestTravelScope, setNewDestTravelScope] = useState<TravelScope>('DOMESTIC');
    const [newDestCountryCode, setNewDestCountryCode] = useState('VN');
    const [isCreatingDest, setIsCreatingDest] = useState(false);
    const [newDestError, setNewDestError] = useState('');

    // Duration state
    const [durationMode, setDurationMode] = useState<'preset' | 'custom'>('preset');
    const [customDuration, setCustomDuration] = useState('');

    // Departure point mode state
    const [depPointMode, setDepPointMode] = useState<'select' | 'custom'>('select');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const newDestInputRef = useRef<HTMLInputElement>(null);

    // ── Pre-fill on edit ──────────────────────────────────────────────
    useEffect(() => {
        if (mode === 'edit' && initialData) {
            const startDate = initialData.startDate
                ? new Date(initialData.startDate).toISOString().split('T')[0] : '';
            const duration = initialData.duration || '';
            const isPreset = DURATION_PRESETS.slice(0, -1).includes(duration);
            const destinationId =
                initialData.destination?.name === DRAFT_DESTINATION_NAME
                    ? ''
                    : String(initialData.destination?.id || initialData.destinationId || '');
            setForm({
                name: initialData.name || '',
                nameEn: initialData.nameEn || '',
                description: initialData.description || '',
                descriptionEn: initialData.descriptionEn || '',
                price: String(initialData.price || ''),
                destinationId,
                startDate,
                duration: isPreset ? duration : (duration ? 'Khác (tùy chỉnh)' : ''),
                durationEn: initialData.durationEn || '',
                availableSeats: String(initialData.availableSeats || ''),
                tourType: initialData.tourType || 'Tour Gia Đình',
                imageUrl: initialData.imageUrl || '',
                departurePoint: initialData.departurePoint || '',
                departurePointEn: initialData.departurePointEn || '',
            });
            if (!isPreset && duration) {
                setDurationMode('custom');
                setCustomDuration(duration);
            }
            setImagePreview(initialData.imageUrl || '');
            // Load existing gallery images
            setExistingImages(initialData.images ?? []);
            // Pre-fill packages
            if (initialData.packages?.length) {
                setPackages(initialData.packages.map((p: ExistingTourPackage) => ({
                    id: p.id, name: p.name || '', nameEn: p.nameEn || '', description: p.description || '', descriptionEn: p.descriptionEn || '',
                    nameMode: (PACKAGE_NAMES.includes(p.name || '') ? 'select' : 'custom') as 'select' | 'custom',
                    price: String(p.price || ''), badge: p.badge || '',
                    includes: Array.isArray(p.includes) ? p.includes : (p.includes || '').split('\n').map((s: string) => s.trim()).filter(Boolean),
                    includesEn: Array.isArray(p.includesEn) ? p.includesEn : (p.includesEn || '').split('\n').map((s: string) => s.trim()).filter(Boolean),
                    excludes: Array.isArray(p.excludes) ? p.excludes : (p.excludes || '').split('\n').map((s: string) => s.trim()).filter(Boolean),
                    excludesEn: Array.isArray(p.excludesEn) ? p.excludesEn : (p.excludesEn || '').split('\n').map((s: string) => s.trim()).filter(Boolean),
                })));
            }
            if (initialData.departures?.length) {
                setDepartures(initialData.departures
                    .map((d: ExistingTourDeparture) => ({
                        id: d.id,
                        departureDate: d.departureDate && !isNaN(new Date(d.departureDate).getTime()) ? new Date(d.departureDate).toISOString().split('T')[0] : '',
                        price: d.price != null ? String(d.price) : '',
                        availableSeats: String(d.availableSeats ?? ''),
                        maxSeats: String(d.maxSeats ?? d.availableSeats ?? ''),
                        note: d.note || '',
                        noteEn: d.noteEn || '',
                        category: toUiDepartureCategory(d.category),
                        flashSaleEndsAt: d.flashSaleEndsAt && !isNaN(new Date(d.flashSaleEndsAt).getTime()) ? new Date(d.flashSaleEndsAt).toISOString().slice(0, 16) : '',
                    }))
                    .filter(d => d.departureDate && isBookableDepartureDate(d.departureDate)));
            }
            // Pre-fill departure point mode
            if (initialData.departurePoint) {
                const isPreset = DEPARTURE_POINTS.includes(initialData.departurePoint);
                if (!isPreset) setDepPointMode('custom');
            }
        }
    }, [mode, initialData]);

    useEffect(() => {
        setDestinations(initialDestinations);
    }, [initialDestinations]);

    useEffect(() => {
        firstInputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (showNewDest) newDestInputRef.current?.focus();
    }, [showNewDest]);

    // ── Helpers ───────────────────────────────────────────────────────
    const handleChange = (field: keyof TourFormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setIsDirty(true);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleDurationSelect = (val: string) => {
        if (val === 'Khác (tùy chỉnh)') {
            setDurationMode('custom');
            handleChange('duration', customDuration);
        } else {
            setDurationMode('preset');
            setCustomDuration('');
            handleChange('duration', val);
        }
    };

    // ── Create Destination ────────────────────────────────────────────
    const handleCreateDestination = async () => {
        const name = newDestName.trim();
        if (!name) { setNewDestError('Vui lòng nhập tên điểm đến'); return; }
        if (destinations.some(d => d.name.toLowerCase() === name.toLowerCase())) {
            setNewDestError('Điểm đến này đã tồn tại'); return;
        }
        setIsCreatingDest(true);
        setNewDestError('');
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/search/destinations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    travelScope: newDestTravelScope,
                    countryCode: newDestCountryCode.trim() || undefined,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Không thể tạo điểm đến');
            }
            const raw = await res.json();
            // Backend may return { data: {...} } or the object directly
            const newDest: Destination = raw?.data ?? raw;
            if (!newDest?.id || !newDest?.name) throw new Error('Phản hồi server không hợp lệ');
            const updated = [...destinations, newDest].sort((a, b) =>
                (a.name ?? '').localeCompare(b.name ?? '')
            );
            setDestinations(updated);
            handleChange('destinationId', String(newDest.id));
            onDestinationCreated?.(newDest);
            setNewDestName('');
            setNewDestTravelScope('DOMESTIC');
            setNewDestCountryCode('VN');
            setShowNewDest(false);
        } catch (e: unknown) {
            setNewDestError(e instanceof Error ? e.message : 'Tạo điểm đến thất bại');
        } finally {
            setIsCreatingDest(false);
        }
    };

    // ── Validate ─────────────────────────────────────────────────────
    const validateForReview = (): boolean => {
        setGlobalError('');
        const newErrors: Partial<TourFormData> = {};
        if (!form.name.trim()) newErrors.name = 'Tên tour không được để trống';
        if (!form.description.trim()) newErrors.description = 'Mô tả không được để trống';
        if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
            newErrors.price = 'Giá phải là số dương';
        if (!form.destinationId) newErrors.destinationId = 'Vui lòng chọn điểm đến';
        
        // Validate departures instead of startDate
        const validDepartures = departures.filter(d => d.departureDate && isBookableDepartureDate(d.departureDate));
        if (validDepartures.length === 0) {
            setGlobalError('Vui lòng thêm ít nhất 1 chuyến khởi hành hợp lệ ở Mục 6 (Ngày Khởi Hành).');
            return false;
        }
        const finalDuration = durationMode === 'custom' ? customDuration : form.duration;
        if (!finalDuration.trim()) newErrors.duration = 'Thời lượng không được để trống';
        if (!form.availableSeats || isNaN(Number(form.availableSeats)) || Number(form.availableSeats) < 1)
            newErrors.availableSeats = 'Số ghế phải ít nhất là 1';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ── Submit ────────────────────────────────────────────────────────
    const handleSave = async (action: 'draft' | 'submit') => {
        if (action === 'submit' && !validateForReview()) return;
        const editId = initialData?.id;
        if (mode === 'edit' && !editId) {
            setGlobalError('Không tìm thấy dữ liệu tour cần chỉnh sửa.');
            return;
        }

        const finalDuration = durationMode === 'custom' ? customDuration : form.duration;
        const validDepartures = departures
            .filter(d => d.departureDate && isBookableDepartureDate(d.departureDate))
            .sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime());
        const primaryStartDate = validDepartures[0]?.departureDate || form.startDate || MIN_START_DATE;
        const shouldPublishAfterSave = isAdminLike && action === 'submit' && initialData?.status !== 'PUBLISHED';
        const nextStatus = action === 'draft'
            ? 'DRAFT'
            : shouldPublishAfterSave
                ? 'DRAFT'
                : initialData?.status === 'PUBLISHED'
                    ? 'PUBLISHED'
                    : undefined;
        const payload = { ...form, duration: finalDuration, startDate: primaryStartDate, status: nextStatus };

        setSaveAction(action);
        try {
            let response: Response;
            const url = mode === 'edit'
                ? `${API_BASE_URL}/tour/${editId}`
                : `${API_BASE_URL}/tour`;
            const method = mode === 'edit' ? 'PATCH' : 'POST';

            if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);
                Object.entries(payload).forEach(([key, val]) => {
                    if (key === 'imageUrl' || val === '' || val == null) return;
                    if (key === 'price' || key === 'availableSeats') {
                        formData.append(key, String(Number(val) || 0));
                        return;
                    }
                    formData.append(key, String(val));
                });
                response = await fetchWithAuth(url, { method, body: formData });
            } else {
                const body = {
                    ...payload,
                    price: payload.price ? Number(payload.price) : 0,
                    destinationId: payload.destinationId ? Number(payload.destinationId) : undefined,
                    availableSeats: payload.availableSeats ? Number(payload.availableSeats) : 0,
                };
                response = await fetchWithAuth(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            }

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Có lỗi xảy ra');
            }
            const saved = await response.json();
            const tourId = saved?.data?.id ?? saved?.id ?? initialData?.id;

            // Save packages
            if (tourId && packages.length > 0) {
                const pkgPayload = packages
                    .filter(p => p.name.trim() && p.price)
                    .map((p, i) => ({
                        name: p.name.trim(),
                        nameEn: p.nameEn.trim() || undefined,
                        description: p.description.trim(),
                        descriptionEn: p.descriptionEn.trim() || undefined,
                        price: Number(p.price),
                        badge: p.badge.trim() || undefined,
                        includes: p.includes.filter(Boolean),
                        includesEn: p.includesEn.filter(Boolean),
                        excludes: p.excludes.filter(Boolean),
                        excludesEn: p.excludesEn.filter(Boolean),
                        sortOrder: i,
                    }));
                await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/packages/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ packages: pkgPayload }),
                });
            }

            if (tourId) {
                const depPayload = departures
                    .filter(d => d.departureDate && isBookableDepartureDate(d.departureDate))
                    .map((d, i) => ({
                        departureDate: d.departureDate,
                        price: d.price ? Number(d.price) : null,
                        availableSeats: Number(d.availableSeats) || 0,
                        maxSeats: Number(d.maxSeats) || Number(d.availableSeats) || 0,
                        note: d.note.trim() || undefined,
                        noteEn: d.noteEn.trim() || undefined,
                        category: UI_TO_API_DEPARTURE_CATEGORY[d.category],
                        flashSaleEndsAt: (d.category === 'flash' && d.flashSaleEndsAt) ? new Date(d.flashSaleEndsAt).toISOString() : null,
                        sortOrder: i,
                    }));
                await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/departures/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ departures: depPayload }),
                });
            }

            if (isStaff && action === 'submit' && tourId) {
                const submitRes = await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/submit`, { method: 'POST' });
                if (!submitRes.ok) {
                    const err = await submitRes.json().catch(() => ({}));
                    throw new Error(err.message || 'Gửi duyệt thất bại');
                }
            }

            // Upload gallery images nếu có
            if (tourId && galleryFiles.length > 0) {
                const galleryForm = new FormData();
                galleryFiles.forEach(f => galleryForm.append('images', f));
                await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/images`, {
                    method: 'POST',
                    body: galleryForm,
                });
            }

            if (shouldPublishAfterSave && tourId) {
                const publishRes = await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/publish`, { method: 'PATCH' });
                if (!publishRes.ok) {
                    const err = await publishRes.json().catch(() => ({}));
                    throw new Error(err.message || 'Public tour that bai');
                }
            }

            const successMessage = isStaff
                ? action === 'submit'
                    ? 'Đã lưu và gửi tour để Admin duyệt!'
                    : 'Đã lưu bản nháp tour!'
                : action === 'draft'
                    ? 'Đã lưu bản nháp tour!'
                    : shouldPublishAfterSave
                        ? 'Đã public tour lên trang khách hàng!'
                        : 'Cập nhật tour thành công!';

            onSuccess(successMessage, saved?.data ?? saved, action);
            onClose();
        } catch (err: unknown) {
            setGlobalError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu tour. Vui lòng thử lại.');
        } finally {
            setSaveAction(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void handleSave('submit');
    };

    const isSaving = saveAction !== null;
    const isPublishedEdit = mode === 'edit' && initialData?.status === 'PUBLISHED';
    const primaryIcon = isStaff ? 'send' : isPublishedEdit ? 'save' : 'publish';
    const primaryLabel = isStaff ? 'Lưu & gửi duyệt' : isPublishedEdit ? 'Lưu thay đổi' : 'Xác nhận public';
    const requiredMark = (
        <span className="normal-case tracking-normal text-on-surface-variant/50">
            {isStaff ? '(khi gửi duyệt)' : '(khi public)'}
        </span>
    );

    const handleCloseAttempt = () => {
        if (isDirty) {
            setShowConfirmClose(true);
        } else {
            onClose();
        }
    };

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ overscrollBehavior: 'contain' }}
            role="dialog" aria-modal="true" aria-labelledby="modal-title"
        >
            {/* Global Error Toast (Top Right) */}
            {globalError && (
                <div className="fixed top-6 right-6 z-[60] flex items-start gap-3.5 p-4 bg-white border border-error/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl w-[380px] animate-fade-slide-up">
                    <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-error text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                        <p className="text-sm font-bold text-on-surface mb-1">Không thể lưu tour</p>
                        <p className="text-[13px] text-on-surface-variant leading-relaxed">{globalError}</p>
                    </div>
                    <button type="button" onClick={() => setGlobalError('')} className="p-2 -mr-1 -mt-1 text-on-surface-variant hover:bg-surface-container hover:text-error rounded-xl transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            )}

            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

            {/* ── Custom Confirm-Close Dialog ── */}
            {showConfirmClose && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="relative bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm mx-4 animate-fade-slide-up">
                        {/* Icon */}
                        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
                            <span className="material-symbols-outlined text-amber-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                        </div>
                        <h3 className="text-base font-bold text-on-surface text-center mb-2">Rời khỏi không lưu?</h3>
                        <p className="text-sm text-on-surface-variant text-center mb-6 leading-relaxed">
                            Bạn có thay đổi chưa được lưu. Nếu rời, mọi chỉnh sửa sẽ mất.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmClose(false)}
                                className="flex-1 py-3 rounded-2xl border border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                            >
                                Tiếp tục chỉnh sửa
                            </button>
                            <button
                                onClick={() => { setShowConfirmClose(false); onClose(); }}
                                className="flex-1 py-3 rounded-2xl bg-error text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                            >
                                Rời khỏi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Panel */}
            <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden animate-fade-slide-up">

                {/* ── Hero Header ── */}
                <div className="relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '50px 50px, 35px 35px' }} />
                    <div className="relative z-[1] px-7 py-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[22px]">
                                    {mode === 'edit' ? 'edit_note' : 'add_location_alt'}
                                </span>
                            </div>
                            <div>
                                <h2 id="modal-title" className="font-headline text-lg font-bold text-white leading-tight">
                                    {mode === 'edit' ? 'Chỉnh Sửa Tour' : isStaff ? 'Tạo Bản Nháp Tour' : 'Tạo Tour Mới'}
                                </h2>
                                <p className="text-white/60 text-xs mt-0.5">
                                    {mode === 'edit'
                                        ? `Đang sửa: ${initialData?.name || 'bản nháp tour'}`
                                            : isStaff
                                                ? 'Lưu nháp trước, hoàn thiện sau rồi gửi Admin duyệt'
                                                : 'Lưu nháp trước, kiểm tra rồi xác nhận public lên trang khách hàng'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCloseAttempt}
                            aria-label="Đóng modal"
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                {/* ── Form Body ── */}
                <form id="tour-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-7 py-6 space-y-7" noValidate>

                    {/* ─── Section 1: Thông tin cơ bản ─── */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[14px]">info</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Thông tin cơ bản</h3>
                        </div>

                        <div className="space-y-4 bg-surface-container-low/40 rounded-2xl p-5 border border-outline-variant/10">
                            {/* Tour Name */}
                            <div>
                                <label htmlFor="field-name" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Tên Tour {requiredMark}
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">travel_explore</span>
                                    <input
                                        ref={firstInputRef}
                                        id="field-name"
                                        name="name"
                                        type="text"
                                        autoComplete="off"
                                        placeholder="Ví dụ: Ha Long Bay Luxury Cruise…"
                                        value={form.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                        className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.name ? 'border-error' : 'border-outline-variant/20'}`}
                                    />
                                </div>
                                {errors.name && (
                                    <p className="text-error text-xs mt-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">error</span>{errors.name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="field-nameEn" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Tên Tour (English)
                                </label>
                                <input
                                    id="field-nameEn"
                                    name="nameEn"
                                    type="text"
                                    autoComplete="off"
                                    placeholder="Example: Ha Long Bay Luxury Cruise..."
                                    value={form.nameEn}
                                    onChange={e => handleChange('nameEn', e.target.value)}
                                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                                />
                            </div>

                            {/* Tour Type */}
                            <div>
                                <label htmlFor="field-tourType" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Loại Tour</label>
                                <div className="flex flex-wrap gap-2">
                                    {TOUR_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => handleChange('tourType', t.value)}
                                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${form.tourType === t.value
                                                ? 'bg-primary text-on-primary border-primary shadow-sm'
                                                : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant hover:border-primary/30 hover:text-primary'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="field-description" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Mô Tả {requiredMark}
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-on-surface-variant/60 text-base pointer-events-none">description</span>
                                    <textarea
                                        id="field-description"
                                        name="description"
                                        autoComplete="off"
                                        placeholder="Mô tả chi tiết về trải nghiệm tour này…"
                                        rows={3}
                                        value={form.description}
                                        onChange={e => handleChange('description', e.target.value)}
                                        className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors resize-none ${errors.description ? 'border-error' : 'border-outline-variant/20'}`}
                                    />
                                </div>
                                {errors.description && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.description}</p>}
                            </div>

                            <div>
                                <label htmlFor="field-descriptionEn" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Mô Tả (English)
                                </label>
                                <textarea
                                    id="field-descriptionEn"
                                    name="descriptionEn"
                                    autoComplete="off"
                                    placeholder="Describe the tour experience in English..."
                                    rows={3}
                                    value={form.descriptionEn}
                                    onChange={e => handleChange('descriptionEn', e.target.value)}
                                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ─── Section 2: Địa điểm & Lịch trình ─── */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-violet-600 text-[14px]">location_on</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Địa điểm & Lịch trình</h3>
                        </div>

                        <div className="space-y-4 bg-surface-container-low/40 rounded-2xl p-5 border border-outline-variant/10">

                            {/* Destination */}
                            <div>
                                <label htmlFor="field-destinationId" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Điểm Đến {requiredMark}
                                </label>
                                {!showNewDest ? (
                                    <>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">map</span>
                                            <select
                                                id="field-destinationId"
                                                name="destinationId"
                                                value={form.destinationId}
                                                onChange={e => handleChange('destinationId', e.target.value)}
                                                className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-10 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none appearance-none cursor-pointer transition-colors ${errors.destinationId ? 'border-error' : 'border-outline-variant/20'}`}
                                            >
                                                <option value="">Chọn điểm đến…</option>
                                                {destinations.map(d => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.name} · {(d.travelScope ?? 'DOMESTIC') === 'DOMESTIC' ? 'Trong nước' : 'Nước ngoài'}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-base pointer-events-none">expand_more</span>
                                        </div>
                                        {errors.destinationId && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.destinationId}</p>}
                                        {/* Create new destination button */}
                                        <button
                                            type="button"
                                            onClick={() => setShowNewDest(true)}
                                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[15px]">add_circle</span>
                                            Tạo điểm đến mới nếu chưa có
                                        </button>
                                    </>
                                ) : (
                                    /* Inline new destination creation */
                                    <div className="border border-primary/30 bg-primary/5 rounded-xl p-4">
                                        <p className="text-xs font-bold text-primary mb-3 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[15px]">add_location_alt</span>
                                            Thêm điểm đến mới
                                        </p>
                                        <div className="grid gap-3">
                                            <div className="relative flex-1">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">edit_location</span>
                                                <input
                                                    ref={newDestInputRef}
                                                    type="text"
                                                    value={newDestName}
                                                    onChange={e => { setNewDestName(e.target.value); setNewDestError(''); }}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateDestination(); } if (e.key === 'Escape') { setShowNewDest(false); } }}
                                                    placeholder="Ví dụ: Phú Yên, Côn Đảo…"
                                                    className={`w-full bg-surface-container-lowest border rounded-xl pl-10 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${newDestError ? 'border-error' : 'border-outline-variant/20'}`}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                                                <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-1">
                                                    {([
                                                        { value: 'DOMESTIC' as TravelScope, label: 'Trong nước', icon: 'home_pin' },
                                                        { value: 'INTERNATIONAL' as TravelScope, label: 'Nước ngoài', icon: 'public' },
                                                    ]).map(option => {
                                                        const active = newDestTravelScope === option.value;
                                                        return (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    setNewDestTravelScope(option.value);
                                                                    setNewDestCountryCode(option.value === 'DOMESTIC' ? 'VN' : '');
                                                                }}
                                                                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${active ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-[15px]">{option.icon}</span>
                                                                {option.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={newDestCountryCode}
                                                    onChange={e => setNewDestCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                                                    placeholder="Mã QG"
                                                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-semibold uppercase focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCreateDestination}
                                                disabled={isCreatingDest}
                                                className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-1.5 shrink-0"
                                            >
                                                {isCreatingDest
                                                    ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                                    : <><span className="material-symbols-outlined text-base">check</span>Thêm</>
                                                }
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowNewDest(false); setNewDestName(''); setNewDestTravelScope('DOMESTIC'); setNewDestCountryCode('VN'); setNewDestError(''); }}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-base">close</span>
                                            </button>
                                            </div>
                                        </div>
                                        {newDestError && <p className="text-error text-xs mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{newDestError}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Departure Point — dropdown + custom */}
                            <div>
                                <label htmlFor="field-departurePoint" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Điểm Khởi Hành Mặc Định
                                </label>

                                {depPointMode === 'select' ? (
                                    <>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">flight_takeoff</span>
                                            <select
                                                id="field-departurePoint"
                                                value={form.departurePoint}
                                                onChange={e => {
                                                    if (e.target.value === '__custom__') {
                                                        setDepPointMode('custom');
                                                        handleChange('departurePoint', '');
                                                    } else {
                                                        handleChange('departurePoint', e.target.value);
                                                    }
                                                }}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-10 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none appearance-none cursor-pointer transition-colors"
                                            >
                                                <option value="">Chọn điểm khởi hành…</option>
                                                {DEPARTURE_POINTS.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                                <option value="__custom__">➕ Nhập điểm khởi hành khác…</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-base pointer-events-none">expand_more</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="border border-primary/30 bg-primary/5 rounded-xl p-4">
                                        <p className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[15px]">edit_location_alt</span>
                                            Nhập điểm khởi hành tùy chỉnh
                                        </p>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">flight_takeoff</span>
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Ví dụ: Quảng Ninh, Phú Yên…"
                                                    value={form.departurePoint}
                                                    onChange={e => handleChange('departurePoint', e.target.value)}
                                                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-10 pr-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setDepPointMode('select'); if (!DEPARTURE_POINTS.includes(form.departurePoint)) handleChange('departurePoint', ''); }}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors"
                                                title="Quay lại danh sách"
                                            >
                                                <span className="material-symbols-outlined text-base">close</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <p className="text-[11px] text-on-surface-variant/60 mt-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[11px]">info</span>
                                    Hiển thị trên trang chi tiết tour cho khách hàng
                                </p>
                                <input
                                    type="text"
                                    value={form.departurePointEn}
                                    onChange={e => handleChange('departurePointEn', e.target.value)}
                                    placeholder="Departure point in English"
                                    className="mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                                />
                            </div>

                            {/* Duration */}
                            <div className="grid grid-cols-1 gap-4">
                                {/* Duration */}
                                <div>
                                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                        Thời Lượng {requiredMark}
                                    </label>
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">schedule</span>
                                            <select
                                                id="field-duration"
                                                value={durationMode === 'custom' ? 'Khác (tùy chỉnh)' : form.duration}
                                                onChange={e => handleDurationSelect(e.target.value)}
                                                className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-9 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none appearance-none cursor-pointer transition-colors ${errors.duration ? 'border-error' : 'border-outline-variant/20'}`}
                                            >
                                                <option value="">Chọn thời lượng…</option>
                                                {DURATION_PRESETS.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-base pointer-events-none">expand_more</span>
                                        </div>
                                        {/* Custom duration input */}
                                        {durationMode === 'custom' && (
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">edit</span>
                                                <input
                                                    type="text"
                                                    value={customDuration}
                                                    onChange={e => { setCustomDuration(e.target.value); setErrors(p => ({ ...p, duration: undefined })); }}
                                                    placeholder="Ví dụ: 10 Ngày 9 Đêm…"
                                                    className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.duration ? 'border-error' : 'border-primary/30'}`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {errors.duration && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.duration}</p>}
                                    <input
                                        type="text"
                                        value={form.durationEn}
                                        onChange={e => handleChange('durationEn', e.target.value)}
                                        placeholder="Duration in English, e.g. 3 Days 2 Nights"
                                        className="mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Section 3: Giá & Số lượng ─── */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-amber-600 text-[14px]">payments</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Giá & Số lượng</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-surface-container-low/40 rounded-2xl p-5 border border-outline-variant/10">
                            {/* Price */}
                            <div>
                                <label htmlFor="field-price" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Giá niêm yết {requiredMark}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-sm pointer-events-none">₫</span>
                                    <input
                                        id="field-price"
                                        name="price"
                                        type="number"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="Ví dụ: 2500000"
                                        min="0"
                                        step="50000"
                                        value={form.price}
                                        onChange={e => handleChange('price', e.target.value)}
                                        className={`w-full bg-surface-container-lowest border rounded-xl pl-9 pr-16 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.price ? 'border-error' : 'border-outline-variant/20'}`}
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md pointer-events-none tracking-wide">
                                        VNĐ
                                    </span>
                                </div>
                                {form.price && !errors.price && Number(form.price) > 0 && (
                                    <p className="text-[11px] text-on-surface-variant/60 mt-1.5 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[11px]">info</span>
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(form.price))}
                                    </p>
                                )}
                                {errors.price && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.price}</p>}
                            </div>

                            {/* Available Seats */}
                            <div>
                                <label htmlFor="field-availableSeats" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Số Ghế {requiredMark}
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">airline_seat_recline_normal</span>
                                    <input
                                        id="field-availableSeats"
                                        name="availableSeats"
                                        type="number"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="20"
                                        min="1"
                                        value={form.availableSeats}
                                        onChange={e => handleChange('availableSeats', e.target.value)}
                                        className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.availableSeats ? 'border-error' : 'border-outline-variant/20'}`}
                                    />
                                </div>
                                {errors.availableSeats && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.availableSeats}</p>}
                            </div>
                        </div>
                    </div>

                    {/* ─── Section 4: Hình ảnh ─── */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-teal-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-teal-600 text-[14px]">image</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Hình ảnh</h3>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-5 flex items-center gap-5 cursor-pointer hover:border-primary/40 hover:bg-surface-container-lowest/50 transition-all group"
                        >
                            {imagePreview ? (
                                <div className="relative shrink-0">
                                    <Image
                                        src={imagePreview}
                                        alt="Tour preview"
                                        width={96}
                                        height={96}
                                        sizes="96px"
                                        className="h-24 w-24 object-cover rounded-xl shadow-md"
                                    />
                                    <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined text-white text-xl">edit</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-24 h-24 bg-surface-container rounded-xl flex items-center justify-center shrink-0 group-hover:bg-surface-container-low transition-colors">
                                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/50">add_photo_alternate</span>
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                                    {imageFile ? imageFile.name : (imagePreview ? 'Nhấn để thay đổi ảnh' : 'Nhấn để chọn ảnh…')}
                                </p>
                                <p className="text-xs text-on-surface-variant mt-1">JPG, JPEG hoặc PNG · Tối đa 5&nbsp;MB</p>
                                {form.imageUrl && !imageFile && (
                                    <p className="text-xs text-primary mt-1.5 truncate flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">link</span>
                                        {form.imageUrl.split('/').pop()}
                                    </p>
                                )}
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            className="hidden"
                            onChange={handleImageChange}
                            aria-label="Chọn ảnh tour"
                        />
                    </div>

                    {/* ─── Section 4b: Gallery Ảnh ─── */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-indigo-600 text-[14px]">photo_library</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Gallery Ảnh (tối đa 10 ảnh)</h3>
                        </div>

                        {/* Ảnh đã lưu */}
                        {existingImages.length > 0 && (
                            <div className="mb-3">
                                <p className="text-[11px] text-outline mb-2">Ảnh hiện tại</p>
                                <div className="flex flex-wrap gap-2">
                                    {existingImages.map(img => (
                                        <div key={img.id} className="relative group">
                                            <Image src={img.url} alt="gallery" width={80} height={80} sizes="80px" className="h-20 w-20 object-cover rounded-xl border border-outline-variant/20" />
                                            <button
                                                type="button"
                                                disabled={deletingImageId === img.id}
                                                onClick={async () => {
                                                    setDeletingImageId(img.id);
                                                    await fetchWithAuth(`${API_BASE_URL}/tour/${initialData?.id}/images/${img.id}`, { method: 'DELETE' });
                                                    setExistingImages(prev => prev.filter(i => i.id !== img.id));
                                                    setDeletingImageId(null);
                                                }}
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                            >
                                                <span className="material-symbols-outlined text-[11px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upload ảnh mới */}
                        <div
                            onClick={() => galleryInputRef.current?.click()}
                            className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-indigo-400/50 hover:bg-indigo-50/30 transition-all group"
                        >
                            <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                                <span className="material-symbols-outlined text-2xl text-on-surface-variant/50 group-hover:text-indigo-500">add_photo_alternate</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-on-surface group-hover:text-indigo-600 transition-colors">
                                    {galleryFiles.length > 0 ? `Đã chọn ${galleryFiles.length} ảnh mới` : 'Thêm ảnh vào gallery…'}
                                </p>
                                <p className="text-xs text-on-surface-variant mt-0.5">JPG, PNG · Tối đa 5 MB / ảnh</p>
                            </div>
                        </div>

                        {/* Preview ảnh mới chọn */}
                        {galleryPreviews.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {galleryPreviews.map((src, i) => (
                                    <div key={i} className="relative group">
                                        <Image src={src} alt={`new-${i}`} width={80} height={80} sizes="80px" className="h-20 w-20 object-cover rounded-xl border-2 border-indigo-300" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setGalleryFiles(prev => prev.filter((_, idx) => idx !== i));
                                                setGalleryPreviews(prev => prev.filter((_, idx) => idx !== i));
                                            }}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                        >
                                            <span className="material-symbols-outlined text-[11px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <input
                            ref={galleryInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            multiple
                            className="hidden"
                            aria-label="Chọn ảnh gallery"
                            onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setGalleryFiles(prev => [...prev, ...files].slice(0, 10));
                                const newPreviews = files.map(f => URL.createObjectURL(f));
                                setGalleryPreviews(prev => [...prev, ...newPreviews].slice(0, 10));
                                setIsDirty(true);
                                e.target.value = '';
                            }}
                        />
                    </div>

                    {/* ─── Section 5: Gói Tour ─── */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-emerald-600 text-[14px]">package_2</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Gói Tour</h3>
                            <span className="text-[10px] text-on-surface-variant/60 ml-1">(tùy chọn — khách hàng chọn khi đặt)</span>
                        </div>
                        <div className="space-y-4">
                            {packages.map((pkg, idx) => (
                                <div key={idx} className="bg-surface-container-low/40 rounded-2xl p-5 border border-outline-variant/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Gói #{idx + 1}</span>
                                        <button type="button" onClick={() => setPackages(p => p.filter((_, i) => i !== idx))}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Tên gói — dropdown + custom */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tên gói *</label>
                                            {pkg.nameMode === 'select' ? (
                                                <div className="relative">
                                                    <select
                                                        value={pkg.name}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '__custom__') {
                                                                setPackages(p => p.map((x, i) => i === idx ? { ...x, nameMode: 'custom', name: '' } : x));
                                                            } else {
                                                                setPackages(p => p.map((x, i) => i === idx ? { ...x, name: val } : x));
                                                            }
                                                        }}
                                                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 pr-9 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Chọn tên gói…</option>
                                                        {PACKAGE_NAMES.map(n => (
                                                            <option key={n} value={n}>{n}</option>
                                                        ))}
                                                        <option value="__custom__">➕ Nhập tên khác…</option>
                                                    </select>
                                                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-base pointer-events-none">expand_more</span>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1.5">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        placeholder="Tên gói khác…"
                                                        value={pkg.name}
                                                        onChange={e => setPackages(p => p.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                                                        className="flex-1 bg-surface-container-lowest border border-primary/30 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-0"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setPackages(p => p.map((x, i) => i === idx ? { ...x, nameMode: 'select', name: '' } : x))}
                                                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/20 text-on-surface-variant hover:text-error hover:bg-error/5 transition-colors flex-shrink-0"
                                                        title="Quay lại danh sách"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Phụ thu nâng cấp (VNĐ) *</label>
                                            <input type="number" placeholder="0" value={pkg.price}
                                                onChange={e => setPackages(p => p.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Package name (English)</label>
                                            <input type="text" placeholder="Standard Package" value={pkg.nameEn}
                                                onChange={e => setPackages(p => p.map((x, i) => i === idx ? { ...x, nameEn: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Short description (English)</label>
                                            <input type="text" placeholder="Best for families..." value={pkg.descriptionEn}
                                                onChange={e => setPackages(p => p.map((x, i) => i === idx ? { ...x, descriptionEn: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Mô tả ngắn</label>
                                            <input type="text" placeholder="Phù hợp cho gia đình..." value={pkg.description}
                                                onChange={e => setPackages(p => p.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Badge</label>
                                            <select value={pkg.badge}
                                                onChange={e => setPackages(p => p.map((x, i) => i === idx ? { ...x, badge: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                                <option value="">Không có</option>
                                                <option value="POPULAR">🔥 POPULAR</option>
                                                <option value="BEST VALUE">💎 BEST VALUE</option>
                                                <option value="LUXURY">✨ LUXURY</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {/* Bã gồm */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-2">
                                                <span className="mr-1">✓</span>Bao gồm
                                            </label>
                                            <TagChipField
                                                items={pkg.includes}
                                                presets={INCLUDE_PRESETS}
                                                color="emerald"
                                                onChange={val => setPackages(p => p.map((x, i) => i === idx ? { ...x, includes: val } : x))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-2">
                                                <span className="mr-1">EN</span>Included
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={pkg.includesEn.join('\n')}
                                                onChange={e => setPackages(p => p.map((x, i) => i === idx ? { ...x, includesEn: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) } : x))}
                                                placeholder={"Hotel\nMeals\nGuide"}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                                            />
                                        </div>
                                        {/* Không bao gồm */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-error uppercase tracking-wider mb-2">
                                                <span className="mr-1">✗</span>Không bao gồm
                                            </label>
                                            <TagChipField
                                                items={pkg.excludes}
                                                presets={EXCLUDE_PRESETS}
                                                color="red"
                                                onChange={val => setPackages(p => p.map((x, i) => i === idx ? { ...x, excludes: val } : x))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-error uppercase tracking-wider mb-2">
                                                <span className="mr-1">EN</span>Not included
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={pkg.excludesEn.join('\n')}
                                                onChange={e => setPackages(p => p.map((x, i) => i === idx ? { ...x, excludesEn: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) } : x))}
                                                placeholder={"Personal expenses\nTips"}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button"
                                onClick={() => { setPackages(p => [...p, { ...EMPTY_PKG }]); setIsDirty(true); }}
                                className="w-full py-3 border-2 border-dashed border-emerald-300 rounded-2xl text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                Thêm gói tour
                            </button>
                        </div>
                    </div>

                    {/* ─── Section 6: Ngày Khởi Hành ─── */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 text-[14px]">calendar_month</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Ngày Khởi Hành</h3>
                            <span className="text-[10px] text-on-surface-variant/60 ml-1">(tùy chọn — mỗi ngày có thể có giá riêng)</span>
                        </div>
                        <div className="space-y-3">
                            {departures.map((dep, idx) => (
                                <div key={idx} className="bg-surface-container-low/40 rounded-2xl p-4 border border-outline-variant/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Chuyến #{idx + 1}</span>
                                        <button type="button" onClick={() => setDepartures(d => d.filter((_, i) => i !== idx))}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Ngày khởi hành {requiredMark}</label>
                                            <input type="date" value={dep.departureDate}
                                                min={MIN_START_DATE}
                                                onChange={e => setDepartures(d => d.map((x, i) => i === idx ? { ...x, departureDate: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Phân loại (Sale)</label>
                                            <select value={dep.category}
                                                onChange={e => setDepartures(d => d.map((x, i) => i === idx ? { ...x, category: e.target.value as SaleCategory } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                                <option value="all">Bình thường</option>
                                                <option value="flash">Flash Sale</option>
                                                <option value="early">Đặt Sớm</option>
                                                <option value="lastminute">Giờ Chót</option>
                                            </select>
                                        </div>
                                        {dep.category === 'flash' && (
                                            <div className="col-span-2">
                                                <label className="block text-[11px] font-semibold text-error uppercase tracking-wider mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">timer</span>Thời gian kết thúc Flash Sale *</label>
                                                <input type="datetime-local" value={dep.flashSaleEndsAt}
                                                    onChange={e => setDepartures(d => d.map((x, i) => i === idx ? { ...x, flashSaleEndsAt: e.target.value } : x))}
                                                    className="w-full bg-surface-container-lowest border border-error/50 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-error" />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Số ghế còn {requiredMark}</label>
                                            <input type="number" placeholder="VD: 20" min={0} value={dep.availableSeats}
                                                onChange={e => setDepartures(d => d.map((x, i) => i === idx ? { ...x, availableSeats: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tổng số ghế (Max)</label>
                                            <input type="number" placeholder="VD: 30" min={0} value={dep.maxSeats}
                                                onChange={e => setDepartures(d => d.map((x, i) => i === idx ? { ...x, maxSeats: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Giá riêng (VNĐ)</label>
                                            <input type="number" placeholder={`Mặc định: ${form.price || 'giá tour'}`} value={dep.price}
                                                onChange={e => setDepartures(d => d.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Ghi chú</label>
                                            <input type="text" placeholder="Giá ưu đãi cuối tuần..." value={dep.note}
                                                onChange={e => setDepartures(d => d.map((x, i) => i === idx ? { ...x, note: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Note (English)</label>
                                            <input type="text" placeholder="Weekend deal..." value={dep.noteEn}
                                                onChange={e => setDepartures(d => d.map((x, i) => i === idx ? { ...x, noteEn: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button"
                                onClick={() => { setDepartures(d => [...d, { ...EMPTY_DEP }]); setIsDirty(true); }}
                                className="w-full py-3 border-2 border-dashed border-blue-300 rounded-2xl text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                Thêm ngày khởi hành
                            </button>
                        </div>
                    </div>
                </form>

                {/* ── Footer ── */}
                <div className="px-7 py-5 border-t border-outline-variant/10 bg-surface-container-lowest flex items-center justify-between gap-3 shrink-0">
                    <p className="text-xs text-on-surface-variant">
                        {isStaff
                            ? 'Lưu nháp không bắt buộc đủ thông tin. Chỉ “Lưu & gửi duyệt” mới kiểm tra đủ trường.'
                            : 'Lưu nháp không bắt buộc đủ thông tin. Chỉ “Xác nhận public” mới đưa tour lên trang khách hàng.'}
                    </p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleCloseAttempt}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            Hủy
                        </button>
                        {(isStaff || isAdminLike) && (
                            <button
                                type="button"
                                onClick={() => handleSave('draft')}
                                disabled={isSaving}
                                className="px-5 py-2.5 rounded-xl border border-outline-variant/20 bg-surface text-on-surface text-sm font-semibold hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                            >
                                {saveAction === 'draft' ? (
                                    <>
                                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                        Đang lưu…
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-base">draft</span>
                                        Lưu nháp
                                    </>
                                )}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleSave('submit')}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none shadow-sm"
                        >
                            {saveAction === 'submit' ? (
                                <>
                                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                    Đang lưu…
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">
                                        {primaryIcon}
                                    </span>
                                    {primaryLabel}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
