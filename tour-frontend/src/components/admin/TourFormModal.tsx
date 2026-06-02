'use client';

import { useState, useEffect, useRef, useCallback, useId, type Dispatch, type SetStateAction } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import DatePickerDropdown from '@/components/search/DatePickerDropdown';
import type {
    TravelScope, Destination, TourPackage, TourDeparture, TourFormData,
    SaleCategory, ExistingTourPackage, ExistingTourDeparture,
    TourHighlightForm, TourFaqForm, ExistingTourHighlight, ExistingTourFaq,
    TourItineraryDayForm, TourTimelineEntry, ExistingTourItineraryDay,
    TourFormModalProps,
} from './tourForm/types';
import {
    EMPTY_FORM, DRAFT_DESTINATION_NAME, MIN_START_DATE, isBookableDepartureDate,
    getTodayDateString,
    UI_TO_API_DEPARTURE_CATEGORY, toUiDepartureCategory,
    TOUR_TYPES, DURATION_PRESETS, DEPARTURE_POINTS, PACKAGE_NAMES,
} from './tourForm/constants';
import { TagChipField, INCLUDE_PRESETS, EXCLUDE_PRESETS } from './tourForm/TagChipField';

const HIGHLIGHT_ICONS = [
    { value: 'auto_awesome', label: 'Nổi bật' },
    { value: 'beach_access', label: 'Bãi biển' },
    { value: 'restaurant', label: 'Ẩm thực' },
    { value: 'hotel', label: 'Khách sạn' },
    { value: 'directions_boat', label: 'Tàu thuyền' },
    { value: 'photo_camera', label: 'Chụp ảnh' },
    { value: 'hiking', label: 'Trekking' },
    { value: 'museum', label: 'Văn hóa' },
    { value: 'local_activity', label: 'Hoạt động' },
    { value: 'spa', label: 'Spa' },
];

const EMPTY_HIGHLIGHT: TourHighlightForm = { content: '', contentEn: '', icon: 'auto_awesome' };
const EMPTY_FAQ: TourFaqForm = { question: '', questionEn: '', answer: '', answerEn: '' };

const FAQ_TEMPLATES = [
    {
        category: 'Gia đình',
        question: 'Tour có phù hợp cho trẻ em không?',
        questionEn: 'Is this tour suitable for children?',
        answerHint: 'Nêu độ tuổi phù hợp, cường độ lịch trình và lưu ý nếu có.',
    },
    {
        category: 'Điểm đón',
        question: 'Điểm đón hoặc điểm hẹn ở đâu?',
        questionEn: 'Where is the pickup or meeting point?',
        answerHint: 'Ghi rõ khu vực đón, thời gian có mặt và cách nhận thông tin chi tiết.',
    },
    {
        category: 'Chính sách',
        question: 'Tôi có thể hủy hoặc đổi ngày tour không?',
        questionEn: 'Can I cancel or reschedule the tour?',
        answerHint: 'Nêu điều kiện hủy/đổi ngày, mốc thời gian và cách liên hệ.',
    },
    {
        category: 'Chi phí',
        question: 'Giá tour đã bao gồm những gì?',
        questionEn: 'What is included in the tour price?',
        answerHint: 'Tóm tắt các khoản chính và nhắc khách xem mục bao gồm/không bao gồm.',
    },
    {
        category: 'Chuẩn bị',
        question: 'Tôi cần chuẩn bị gì trước chuyến đi?',
        questionEn: 'What should I prepare before the trip?',
        answerHint: 'Nhắc giấy tờ, trang phục, vật dụng cá nhân hoặc yêu cầu sức khỏe.',
    },
    {
        category: 'Thời tiết',
        question: 'Nếu thời tiết xấu thì tour xử lý như thế nào?',
        questionEn: 'What happens if the weather is bad?',
        answerHint: 'Nêu phương án đổi lịch, điều chỉnh lịch trình hoặc hỗ trợ từ điều hành tour.',
    },
    {
        category: 'Phụ thu',
        question: 'Tour có phụ thu cuối tuần hoặc ngày lễ không?',
        questionEn: 'Are there weekend or holiday surcharges?',
        answerHint: 'Nêu rõ trường hợp phát sinh phụ thu và thời điểm thông báo.',
    },
];

const MEAL_OPTIONS: { key: 'mealsBreakfast' | 'mealsLunch' | 'mealsDinner'; label: string; icon: string }[] = [
    { key: 'mealsBreakfast', label: 'Sáng', icon: 'wb_sunny' },
    { key: 'mealsLunch', label: 'Trưa', icon: 'wb_twilight' },
    { key: 'mealsDinner', label: 'Tối', icon: 'dark_mode' },
];

const FLASH_SALE_TIME_OPTIONS = [
    ...Array.from({ length: 48 }, (_, index) => {
        const hours = String(Math.floor(index / 2)).padStart(2, '0');
        const minutes = index % 2 === 0 ? '00' : '30';
        return `${hours}:${minutes}`;
    }),
    '23:59',
];

const PACKAGE_BADGE_OPTIONS = [
    { value: '', label: 'Không có', icon: 'block', tone: 'text-on-surface-variant' },
    { value: 'POPULAR', label: 'Được chọn nhiều', icon: 'local_fire_department', tone: 'text-orange-600' },
    { value: 'BEST VALUE', label: 'Đáng tiền nhất', icon: 'diamond', tone: 'text-blue-600' },
    { value: 'LUXURY', label: 'Cao cấp', icon: 'auto_awesome', tone: 'text-violet-600' },
];

const ACTIVITY_PRESETS = [
    'Đón khách tại điểm hẹn',
    'Tham quan danh thắng',
    'Khám phá phố cổ',
    'Tự do chụp ảnh',
    'Dùng bữa theo chương trình',
    'Trải nghiệm văn hóa địa phương',
    'Mua sắm đặc sản',
    'Tắm biển / nghỉ ngơi',
    'Check-in điểm nổi bật',
    'Di chuyển về khách sạn',
];

const ACTIVITY_EN_PRESETS = [
    'Pick up at meeting point',
    'Sightseeing visit',
    'Explore the old town',
    'Free time for photos',
    'Scheduled meal',
    'Local cultural experience',
    'Shopping for local specialties',
    'Beach time / relaxation',
    'Highlight check-in stop',
    'Transfer back to hotel',
];

const ACCOMMODATION_PRESETS = [
    'Không lưu trú',
    'Khách sạn trung tâm',
    'Khách sạn 3 sao',
    'Khách sạn 4 sao',
    'Resort ven biển',
    'Homestay địa phương',
    'Du thuyền nghỉ đêm',
    'Theo tiêu chuẩn gói tour',
];

const ACCOMMODATION_EN_PRESETS = [
    'No accommodation',
    'Central hotel',
    '3-star hotel',
    '4-star hotel',
    'Beachfront resort',
    'Local homestay',
    'Overnight cruise',
    'According to tour package standard',
];

const TRANSPORT_PRESETS = [
    'Xe du lịch',
    'Xe limousine',
    'Tàu cao tốc',
    'Du thuyền',
    'Cáp treo',
    'Máy bay',
    'Xe điện',
    'Đi bộ tham quan',
];

const TRANSPORT_EN_PRESETS = [
    'Tourist coach',
    'Limousine van',
    'Speedboat',
    'Cruise',
    'Cable car',
    'Flight',
    'Electric buggy',
    'Walking tour',
];

const createEmptyTimelineEntry = (): TourTimelineEntry => ({ time: '', activity: '' });

const createEmptyItineraryDay = (dayNumber: number): TourItineraryDayForm => ({
    dayNumber,
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    mealsBreakfast: false,
    mealsLunch: false,
    mealsDinner: false,
    accommodation: '',
    accommodationEn: '',
    transport: '',
    transportEn: '',
    activitiesText: '',
    activitiesEnText: '',
    timelineItems: [createEmptyTimelineEntry()],
    timelineEnItems: [createEmptyTimelineEntry()],
    timelineText: '',
    timelineEnText: '',
});

const splitLines = (value: string) =>
    value.split('\n').map(item => item.trim()).filter(Boolean);

const timelineToText = (timeline?: TourTimelineEntry[] | null) =>
    Array.isArray(timeline)
        ? timeline
            .filter(item => item.time || item.activity)
            .map(item => [item.time, item.activity].filter(Boolean).join(' - '))
            .join('\n')
        : '';

const getDatePart = (value: string) => value ? value.slice(0, 10) : '';
const getTimePart = (value: string) => value?.includes('T') ? value.slice(11, 16) : '';
const combineDateTimeLocal = (date: string, time: string) => date ? `${date}T${time || '23:59'}` : '';
const stripCurrencyInput = (value: string) => value.replace(/[^\d]/g, '');
const formatCurrencyInput = (value: string) => {
    const digits = stripCurrencyInput(value);
    return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
};

const normalizeTimelineEntries = (timeline?: TourTimelineEntry[] | null) => {
    const entries = Array.isArray(timeline)
        ? timeline
            .map(item => ({
                time: String(item.time ?? '').trim(),
                activity: String(item.activity ?? '').trim(),
            }))
            .filter(item => item.time || item.activity)
        : [];

    return entries.length ? entries : [createEmptyTimelineEntry()];
};

const cleanTimelineEntries = (timeline?: TourTimelineEntry[] | null) =>
    (Array.isArray(timeline) ? timeline : [])
        .map(item => ({
            time: String(item.time ?? '').trim(),
            activity: String(item.activity ?? '').trim(),
        }))
        .filter(item => item.time && item.activity);

const LEGACY_TOUR_MESSAGE_MAP: Record<string, string> = {
    'Vui long hoan thien thong tin truoc khi gui duyet': 'Vui lòng hoàn thiện thông tin trước khi gửi duyệt',
    'Ten tour': 'Tên tour',
    'Mo ta': 'Mô tả',
    Gia: 'Giá',
    'Diem den': 'Điểm đến',
    'Thoi luong': 'Thời lượng',
    'So ghe': 'Số ghế',
    'Ngay khoi hanh': 'Ngày khởi hành',
    'It nhat 1 chuyen khoi hanh': 'Ít nhất 1 chuyến khởi hành',
    'Ban khong co quyen gui duyet tour nay': 'Bạn không có quyền gửi duyệt tour này',
    'Ban khong co quyen thao tac tour nay': 'Bạn không có quyền thao tác tour này',
    'Ban khong co quyen chinh sua tour nay': 'Bạn không có quyền chỉnh sửa tour này',
    'Ban khong co quyen xoa ban nhap nay': 'Bạn không có quyền xóa bản nháp này',
    'Chi co the thao tac tour o trang thai Ban nhap hoac Bi tu choi': 'Chỉ có thể thao tác tour ở trạng thái Bản nháp hoặc Bị từ chối',
    'Chi co the chinh sua tour o trang thai Ban nhap hoac Bi tu choi': 'Chỉ có thể chỉnh sửa tour ở trạng thái Bản nháp hoặc Bị từ chối',
    'Chi co the xoa tour o trang thai Ban nhap hoac Bi tu choi': 'Chỉ có thể xóa tour ở trạng thái Bản nháp hoặc Bị từ chối',
    'Vui long nhap ly do tu choi': 'Vui lòng nhập lý do từ chối',
    'Tour da ket thuc, khong the publish lai': 'Tour đã kết thúc, không thể public lại',
    'Public tour that bai': 'Public tour thất bại',
};

const normalizeTourMessage = (message: unknown, fallback = 'Có lỗi xảy ra khi lưu tour. Vui lòng thử lại.') => {
    const raw = Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : fallback;
    return Object.entries(LEGACY_TOUR_MESSAGE_MAP).reduce(
        (current, [legacy, localized]) => current.replaceAll(legacy, localized),
        raw,
    );
};

type IndexedTranslation = { index?: number };
type TourEnglishTranslation = {
    nameEn?: string;
    descriptionEn?: string;
    departurePointEn?: string;
    durationEn?: string;
    packages?: (IndexedTranslation & {
        nameEn?: string;
        descriptionEn?: string;
        includesEn?: string[];
        excludesEn?: string[];
    })[];
    departures?: (IndexedTranslation & { noteEn?: string })[];
    highlights?: (IndexedTranslation & { contentEn?: string })[];
    faqs?: (IndexedTranslation & { questionEn?: string; answerEn?: string })[];
    itinerary?: (IndexedTranslation & {
        titleEn?: string;
        descriptionEn?: string;
        accommodationEn?: string;
        transportEn?: string;
        activitiesEn?: string[];
        timelineEn?: TourTimelineEntry[];
    })[];
};

type PackagePresetType = 'INCLUDE' | 'EXCLUDE';
type PackagePresetResponse = {
    id: number;
    type: PackagePresetType;
    label: string;
};

interface PresetTextInputProps {
    value: string;
    presets: string[];
    placeholder: string;
    icon: string;
    className?: string;
    onChange: (value: string) => void;
}

function PresetTextInput({ value, presets, placeholder, icon, className = '', onChange }: PresetTextInputProps) {
    const listboxId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const normalize = (text: string) =>
        text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const normalizedValue = normalize(value);
    const filtered = presets
        .filter(item => !normalizedValue || normalize(item).includes(normalizedValue))
        .slice(0, 7);

    const selectPreset = (preset: string) => {
        onChange(preset);
        setIsOpen(false);
    };

    return (
        <div
            className={`relative ${className}`}
            onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        >
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[16px] text-indigo-600">
                {icon}
            </span>
            <input
                type="text"
                role="combobox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                autoComplete="off"
                value={value}
                onFocus={() => setIsOpen(true)}
                onChange={e => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onKeyDown={e => {
                    if (e.key === 'Escape') setIsOpen(false);
                    if (e.key === 'Enter' && isOpen && filtered[0]) {
                        e.preventDefault();
                        selectPreset(filtered[0]);
                    }
                }}
                placeholder={placeholder}
                className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-2.5 pl-9 pr-16 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            />
            {value ? (
                <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                        onChange('');
                        setIsOpen(true);
                    }}
                    className="absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-error"
                    aria-label="Xóa nội dung"
                >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
            ) : null}
            <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setIsOpen(open => !open)}
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-primary"
                aria-label="Mở danh sách gợi ý"
            >
                <span className={`material-symbols-outlined text-[15px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            {isOpen && (
                <div id={listboxId} className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl">
                    {filtered.length > 0 ? filtered.map(item => (
                        <button
                            key={item}
                            type="button"
                            role="option"
                            aria-selected={value === item}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => selectPreset(item)}
                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${value === item
                                ? 'bg-indigo-600 text-white'
                                : 'text-on-surface hover:bg-surface-container'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[15px]">{value === item ? 'check' : 'add'}</span>
                            <span>{item}</span>
                        </button>
                    )) : (
                        <div className="px-3 py-2 text-xs text-on-surface-variant">
                            Không có gợi ý phù hợp. Bạn vẫn có thể giữ nội dung đang nhập.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


// ── Component ──────────────────────────────────────────────────────────
export default function TourFormModal({
    mode, initialData, destinations: initialDestinations,
    userRole = '', onSuccess, onClose, onDestinationCreated,
}: TourFormModalProps) {
    const isStaff = userRole === 'STAFF';
    const isAdminLike = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const canSaveSharedPackagePreset = isAdminLike;
    const createEmptyDeparture = (): TourDeparture => ({
        departureDate: getTodayDateString(),
        price: '',
        availableSeats: '',
        maxSeats: '',
        note: '',
        noteEn: '',
        category: 'all',
        flashSaleEndsAt: '',
    });
    const [form, setForm] = useState<TourFormData>(() => ({ ...EMPTY_FORM, startDate: getTodayDateString() }));
    const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [errors, setErrors] = useState<Partial<TourFormData>>({});
    const [globalError, setGlobalError] = useState('');
    const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [showEnglishFields, setShowEnglishFields] = useState(false);
    const [isTranslatingEnglish, setIsTranslatingEnglish] = useState(false);

    // Gallery state
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<{ id: number; url: string }[]>([]);
    const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Package state
    const [packages, setPackages] = useState<TourPackage[]>([]);
    const EMPTY_PKG: TourPackage = { name: '', nameEn: '', nameMode: 'select', description: '', descriptionEn: '', price: '', badge: '', includes: [], includesEn: [], excludes: [], excludesEn: [] };
    const [includePresets, setIncludePresets] = useState<string[]>(INCLUDE_PRESETS);
    const [excludePresets, setExcludePresets] = useState<string[]>(EXCLUDE_PRESETS);

    // Departure state
    const [departures, setDepartures] = useState<TourDeparture[]>(() => mode === 'create' ? [createEmptyDeparture()] : []);

    // Sales content state
    const [highlights, setHighlights] = useState<TourHighlightForm[]>([]);
    const [faqs, setFaqs] = useState<TourFaqForm[]>([]);
    const [itinerary, setItinerary] = useState<TourItineraryDayForm[]>([]);

    // Confirm-close dialog state
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Destination creation state
    const [showNewDest, setShowNewDest] = useState(false);
    const [newDestName, setNewDestName] = useState('');
    const [newDestTravelScope, setNewDestTravelScope] = useState<TravelScope>('DOMESTIC');
    const [newDestCountryCode, setNewDestCountryCode] = useState('VN');
    const [isCreatingDest, setIsCreatingDest] = useState(false);
    const [newDestError, setNewDestError] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');
    const [isDestinationListOpen, setIsDestinationListOpen] = useState(false);
    const [departurePointQuery, setDeparturePointQuery] = useState('');
    const [isDeparturePointListOpen, setIsDeparturePointListOpen] = useState(false);

    // Duration state
    const [durationMode, setDurationMode] = useState<'preset' | 'custom'>('preset');
    const [customDuration, setCustomDuration] = useState('');
    const [isDurationListOpen, setIsDurationListOpen] = useState(false);
    const [openFlashTimeIndex, setOpenFlashTimeIndex] = useState<number | null>(null);
    const [openPackageNameIndex, setOpenPackageNameIndex] = useState<number | null>(null);
    const [openPackageBadgeIndex, setOpenPackageBadgeIndex] = useState<number | null>(null);
    const [openHighlightIconIndex, setOpenHighlightIconIndex] = useState<number | null>(null);
    const [openFaqTemplateIndex, setOpenFaqTemplateIndex] = useState<number | null>(null);

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
            const matchedDestination = initialDestinations.find(d => String(d.id) === destinationId) ?? initialData.destination;
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
            setDestinationQuery(matchedDestination?.name
                ? `${matchedDestination.name} · ${(matchedDestination.travelScope ?? 'DOMESTIC') === 'DOMESTIC' ? 'Trong nước' : 'Nước ngoài'}`
                : ''
            );
            setDeparturePointQuery(initialData.departurePoint || '');
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
            setHighlights(initialData.highlights?.length
                ? initialData.highlights.map((h: ExistingTourHighlight) => ({
                    id: h.id,
                    content: h.content || '',
                    contentEn: h.contentEn || '',
                    icon: h.icon || 'auto_awesome',
                }))
                : []
            );
            setFaqs(initialData.faqs?.length
                ? initialData.faqs.map((f: ExistingTourFaq) => ({
                    id: f.id,
                    question: f.question || '',
                    questionEn: f.questionEn || '',
                    answer: f.answer || '',
                    answerEn: f.answerEn || '',
                }))
                : []
            );
            setItinerary(initialData.itinerary?.length
                ? [...initialData.itinerary]
                    .sort((a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0))
                    .map((day: ExistingTourItineraryDay, index) => ({
                        id: day.id,
                        dayNumber: day.dayNumber ?? index + 1,
                        title: day.title || '',
                        titleEn: day.titleEn || '',
                        description: day.description || '',
                        descriptionEn: day.descriptionEn || '',
                        mealsBreakfast: !!day.mealsBreakfast,
                        mealsLunch: !!day.mealsLunch,
                        mealsDinner: !!day.mealsDinner,
                        accommodation: day.accommodation || '',
                        accommodationEn: day.accommodationEn || '',
                        transport: day.transport || '',
                        transportEn: day.transportEn || '',
                        activitiesText: Array.isArray(day.activities) ? day.activities.join('\n') : '',
                        activitiesEnText: Array.isArray(day.activitiesEn) ? day.activitiesEn.join('\n') : '',
                        timelineItems: normalizeTimelineEntries(day.timeline),
                        timelineEnItems: normalizeTimelineEntries(day.timelineEn),
                        timelineText: timelineToText(day.timeline),
                        timelineEnText: timelineToText(day.timelineEn),
                    }))
                : []
            );
        }
    }, [mode, initialData, initialDestinations]);

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

    const normalizeSearchValue = useCallback((value: string) =>
        value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(), []);

    const mergePresetLabels = useCallback((base: string[], remote: string[]) => {
        const seen = new Set<string>();
        return [...base, ...remote].filter(label => {
            const normalized = normalizeSearchValue(label);
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    }, [normalizeSearchValue]);

    useEffect(() => {
        let cancelled = false;

        const loadPresets = async (
            type: PackagePresetType,
            fallback: string[],
            setter: Dispatch<SetStateAction<string[]>>,
        ) => {
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/tour/package-presets?type=${type}`);
                if (!response.ok) return;
                const raw = await response.json();
                const data = (raw?.data ?? raw) as PackagePresetResponse[];
                if (cancelled || !Array.isArray(data)) return;
                setter(mergePresetLabels(fallback, data.map(item => item.label).filter(Boolean)));
            } catch {
                // Keep local fallback presets if the shared preset API is unavailable.
            }
        };

        void loadPresets('INCLUDE', INCLUDE_PRESETS, setIncludePresets);
        void loadPresets('EXCLUDE', EXCLUDE_PRESETS, setExcludePresets);

        return () => {
            cancelled = true;
        };
    }, [mergePresetLabels]);

    const createSharedPackagePreset = async (type: PackagePresetType, label: string) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/tour/package-presets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, label }),
        });
        const raw = await response.json().catch(() => null);
        if (!response.ok) {
            const message = Array.isArray(raw?.message)
                ? raw.message.join(', ')
                : raw?.message || 'Không thể lưu vào danh mục dùng chung';
            throw new Error(message);
        }
        const preset = (raw?.data ?? raw) as PackagePresetResponse;
        const savedLabel = preset?.label || label.trim();
        const setter = type === 'INCLUDE' ? setIncludePresets : setExcludePresets;
        const fallback = type === 'INCLUDE' ? INCLUDE_PRESETS : EXCLUDE_PRESETS;
        setter(prev => mergePresetLabels(fallback, [...prev, savedLabel]));
        return savedLabel;
    };

    const getDestinationLabel = (destination: Destination) =>
        `${destination.name} · ${(destination.travelScope ?? 'DOMESTIC') === 'DOMESTIC' ? 'Trong nước' : 'Nước ngoài'}`;

    const selectDestination = (destination: Destination) => {
        handleChange('destinationId', String(destination.id));
        setDestinationQuery(getDestinationLabel(destination));
        setIsDestinationListOpen(false);
    };

    const clearDestination = () => {
        handleChange('destinationId', '');
        setDestinationQuery('');
        setIsDestinationListOpen(true);
    };

    const selectDeparturePoint = (value: string) => {
        handleChange('departurePoint', value);
        setDeparturePointQuery(value);
        setIsDeparturePointListOpen(false);
    };

    const clearDeparturePoint = () => {
        handleChange('departurePoint', '');
        setDeparturePointQuery('');
        setIsDeparturePointListOpen(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setIsDirty(true);
        setImagePreview(URL.createObjectURL(file));
    };

    const updateDeparture = (idx: number, patch: Partial<TourDeparture>) => {
        setDepartures(d => d.map((x, i) => i === idx ? { ...x, ...patch } : x));
        setIsDirty(true);
        setErrors(prev => ({ ...prev, startDate: undefined }));
        setGlobalError('');
    };

    const updateDepartureCategory = (idx: number, category: SaleCategory) => {
        const departure = departures[idx];
        const defaultFlashDate = departure?.departureDate || MIN_START_DATE;
        updateDeparture(idx, {
            category,
            flashSaleEndsAt: category === 'flash'
                ? departure?.flashSaleEndsAt || combineDateTimeLocal(defaultFlashDate, '23:59')
                : departure?.flashSaleEndsAt,
        });
    };

    const updateFlashSaleDate = (idx: number, date: string) => {
        const current = departures[idx]?.flashSaleEndsAt || '';
        updateDeparture(idx, { flashSaleEndsAt: combineDateTimeLocal(date, getTimePart(current) || '23:59') });
    };

    const updateFlashSaleTime = (idx: number, time: string) => {
        const current = departures[idx]?.flashSaleEndsAt || '';
        const fallbackDate = departures[idx]?.departureDate || MIN_START_DATE;
        updateDeparture(idx, { flashSaleEndsAt: combineDateTimeLocal(getDatePart(current) || fallbackDate, time) });
        setOpenFlashTimeIndex(null);
    };

    const updatePackage = (idx: number, patch: Partial<TourPackage>) => {
        setPackages(prev => prev.map((pkg, i) => i === idx ? { ...pkg, ...patch } : pkg));
        setIsDirty(true);
    };

    const selectPackageBadge = (idx: number, badge: string) => {
        updatePackage(idx, { badge });
        setOpenPackageBadgeIndex(null);
    };

    const selectHighlightIcon = (idx: number, icon: string) => {
        updateHighlight(idx, { icon });
        setOpenHighlightIconIndex(null);
    };

    const applyFaqTemplate = (idx: number, template: typeof FAQ_TEMPLATES[number]) => {
        updateFaq(idx, {
            question: template.question,
            questionEn: template.questionEn,
        });
        setOpenFaqTemplateIndex(null);
    };

    const updateHighlight = (idx: number, patch: Partial<TourHighlightForm>) => {
        setHighlights(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
        setIsDirty(true);
    };

    const updateFaq = (idx: number, patch: Partial<TourFaqForm>) => {
        setFaqs(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
        setIsDirty(true);
    };

    const updateItineraryDay = (idx: number, patch: Partial<TourItineraryDayForm>) => {
        setItinerary(prev => prev.map((day, i) => i === idx ? { ...day, ...patch } : day));
        setIsDirty(true);
    };

    const updateItineraryTimelineEntry = (
        dayIndex: number,
        field: 'timelineItems' | 'timelineEnItems',
        entryIndex: number,
        patch: Partial<TourTimelineEntry>,
    ) => {
        setItinerary(prev => prev.map((day, i) => {
            if (i !== dayIndex) return day;
            const entries = day[field]?.length ? day[field] : [createEmptyTimelineEntry()];
            return {
                ...day,
                [field]: entries.map((entry, entryIdx) => entryIdx === entryIndex ? { ...entry, ...patch } : entry),
            };
        }));
        setIsDirty(true);
    };

    const addItineraryTimelineEntry = (dayIndex: number, field: 'timelineItems' | 'timelineEnItems') => {
        setItinerary(prev => prev.map((day, i) => i === dayIndex
            ? { ...day, [field]: [...(day[field]?.length ? day[field] : []), createEmptyTimelineEntry()] }
            : day
        ));
        setIsDirty(true);
    };

    const removeItineraryTimelineEntry = (dayIndex: number, field: 'timelineItems' | 'timelineEnItems', entryIndex: number) => {
        setItinerary(prev => prev.map((day, i) => {
            if (i !== dayIndex) return day;
            const nextEntries = (day[field]?.length ? day[field] : [createEmptyTimelineEntry()]).filter((_, itemIndex) => itemIndex !== entryIndex);
            return { ...day, [field]: nextEntries.length ? nextEntries : [createEmptyTimelineEntry()] };
        }));
        setIsDirty(true);
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
        setIsDurationListOpen(false);
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

    const getReviewReadiness = () => {
        const finalDuration = durationMode === 'custom' ? customDuration : form.duration;
        const validDepartures = departures.filter(d =>
            d.departureDate && isBookableDepartureDate(d.departureDate) && Number(d.availableSeats || 0) > 0
        );
        const galleryImageCount = existingImages.length + galleryFiles.length;
        const hasCoverImage = Boolean(imagePreview || imageFile || form.imageUrl);
        const highlightCount = highlights.filter(item => item.content.trim()).length;
        const faqCount = faqs.filter(item => item.question.trim() && item.answer.trim()).length;
        const itineraryCount = itinerary.filter(day => day.title.trim() && day.description.trim()).length;

        const required = [
            {
                label: 'Tên tour',
                done: Boolean(form.name.trim()),
                target: 'tour-section-basic',
                fieldId: 'field-name',
                field: 'name' as keyof TourFormData,
                error: 'Tên tour không được để trống',
                hint: 'Tên cần đủ rõ để Admin và khách hiểu tour bán gì.',
            },
            {
                label: 'Mô tả',
                done: Boolean(form.description.trim()),
                target: 'tour-section-basic',
                fieldId: 'field-description',
                field: 'description' as keyof TourFormData,
                error: 'Mô tả không được để trống',
                hint: 'Mô tả nên nêu điểm đến, trải nghiệm chính và đối tượng phù hợp.',
            },
            {
                label: 'Điểm đến',
                done: Boolean(form.destinationId),
                target: 'tour-section-location',
                fieldId: 'field-destinationId',
                field: 'destinationId' as keyof TourFormData,
                error: 'Vui lòng chọn điểm đến',
                hint: 'Điểm đến dùng cho bộ lọc và trang chi tiết tour.',
            },
            {
                label: 'Thời lượng',
                done: Boolean(finalDuration.trim()),
                target: 'tour-section-location',
                fieldId: 'field-duration',
                field: 'duration' as keyof TourFormData,
                error: 'Thời lượng không được để trống',
                hint: 'Ví dụ: 3 ngày 2 đêm, 1 ngày, hoặc 5 ngày 4 đêm.',
            },
            {
                label: 'Giá niêm yết',
                done: Boolean(form.price) && Number(form.price) > 0,
                target: 'tour-section-pricing',
                fieldId: 'field-price',
                field: 'price' as keyof TourFormData,
                error: 'Giá phải là số dương',
                hint: 'Giá cơ bản mỗi khách phải lớn hơn 0.',
            },
            {
                label: 'Số ghế',
                done: Boolean(form.availableSeats) && Number(form.availableSeats) >= 1,
                target: 'tour-section-pricing',
                fieldId: 'field-availableSeats',
                field: 'availableSeats' as keyof TourFormData,
                error: 'Số ghế phải ít nhất là 1',
                hint: 'Số ghế mặc định phải từ 1 trở lên.',
            },
            {
                label: 'Ít nhất 1 chuyến khởi hành',
                done: validDepartures.length > 0,
                target: 'tour-section-departures',
                fieldId: 'tour-section-departures',
                field: 'startDate' as keyof TourFormData,
                error: 'Vui lòng thêm ít nhất 1 chuyến khởi hành có ngày hợp lệ và số ghế lớn hơn 0',
                hint: 'Chuyến hợp lệ cần ngày không ở quá khứ và số ghế còn lớn hơn 0.',
            },
        ];

        const recommended = [
            {
                label: 'Ảnh bìa',
                done: hasCoverImage,
                target: 'tour-section-cover',
                hint: 'Ảnh bìa giúp tour rõ chủ thể trên card và trang chi tiết.',
            },
            {
                label: 'Gallery từ 6 ảnh',
                done: galleryImageCount >= 6,
                target: 'tour-section-gallery',
                hint: `Hiện có ${galleryImageCount}/6 ảnh khuyến nghị.`,
            },
            {
                label: 'Gói tour',
                done: packages.some(pkg => Boolean(pkg.name.trim()) && pkg.price !== ''),
                target: 'tour-section-packages',
                hint: 'Nên thêm nếu tour có gói tiêu chuẩn, cao cấp hoặc luxury.',
            },
            {
                label: 'Điểm nổi bật',
                done: highlightCount >= 3,
                target: 'tour-section-highlights',
                hint: `Hiện có ${highlightCount}/3 điểm nổi bật khuyến nghị.`,
            },
            {
                label: 'FAQ',
                done: faqCount >= 2,
                target: 'tour-section-faqs',
                hint: `Hiện có ${faqCount}/2 câu hỏi khuyến nghị.`,
            },
            {
                label: 'Lịch trình',
                done: itineraryCount > 0,
                target: 'tour-section-itinerary',
                hint: `Hiện có ${itineraryCount} ngày lịch trình đã đủ tiêu đề và mô tả.`,
            },
        ];

        return {
            required,
            recommended,
            validDepartureCount: validDepartures.length,
            missingRequired: required.filter(item => !item.done),
            completedRequired: required.filter(item => item.done).length,
            completedRecommended: recommended.filter(item => item.done).length,
        };
    };

    const focusReviewIssue = (issue: { target: string; fieldId?: string }) => {
        window.setTimeout(() => {
            const target = document.getElementById(issue.fieldId || issue.target);
            const section = document.getElementById(issue.target);
            (target || section)?.scrollIntoView({ block: 'center', behavior: 'smooth' });

            window.setTimeout(() => {
                const focusTarget =
                    target instanceof HTMLElement
                        ? target
                        : section?.querySelector<HTMLElement>('input, select, textarea, button:not([disabled])') ?? null;
                focusTarget?.focus({ preventScroll: true });
            }, 250);
        }, 0);
    };

    const buildEnglishTranslationPayload = () => ({
        name: form.name,
        description: form.description,
        departurePoint: form.departurePoint,
        duration: durationMode === 'custom' ? customDuration : form.duration,
        packages: packages.map((pkg, index) => ({
            index,
            name: pkg.name,
            description: pkg.description,
            includes: pkg.includes,
            excludes: pkg.excludes,
        })),
        departures: departures.map((departure, index) => ({
            index,
            note: departure.note,
        })),
        highlights: highlights.map((highlight, index) => ({
            index,
            content: highlight.content,
        })),
        faqs: faqs.map((faq, index) => ({
            index,
            question: faq.question,
            answer: faq.answer,
        })),
        itinerary: itinerary.map((day, index) => ({
            index,
            title: day.title,
            description: day.description,
            accommodation: day.accommodation,
            transport: day.transport,
            activities: splitLines(day.activitiesText),
            timeline: cleanTimelineEntries(day.timelineItems),
        })),
    });

    const findTranslationItem = <T extends IndexedTranslation>(items: T[] | undefined, index: number) =>
        Array.isArray(items) ? items.find(item => Number(item.index) === index) : undefined;

    const applyEnglishTranslation = (translation: TourEnglishTranslation) => {
        setForm(prev => ({
            ...prev,
            nameEn: translation.nameEn?.trim() || prev.nameEn,
            descriptionEn: translation.descriptionEn?.trim() || prev.descriptionEn,
            departurePointEn: translation.departurePointEn?.trim() || prev.departurePointEn,
            durationEn: translation.durationEn?.trim() || prev.durationEn,
        }));
        setPackages(prev => prev.map((pkg, index) => {
            const item = findTranslationItem(translation.packages, index);
            return item ? {
                ...pkg,
                nameEn: item.nameEn?.trim() || pkg.nameEn,
                descriptionEn: item.descriptionEn?.trim() || pkg.descriptionEn,
                includesEn: item.includesEn?.length ? item.includesEn : pkg.includesEn,
                excludesEn: item.excludesEn?.length ? item.excludesEn : pkg.excludesEn,
            } : pkg;
        }));
        setDepartures(prev => prev.map((departure, index) => {
            const item = findTranslationItem(translation.departures, index);
            return item ? { ...departure, noteEn: item.noteEn?.trim() || departure.noteEn } : departure;
        }));
        setHighlights(prev => prev.map((highlight, index) => {
            const item = findTranslationItem(translation.highlights, index);
            return item ? { ...highlight, contentEn: item.contentEn?.trim() || highlight.contentEn } : highlight;
        }));
        setFaqs(prev => prev.map((faq, index) => {
            const item = findTranslationItem(translation.faqs, index);
            return item ? {
                ...faq,
                questionEn: item.questionEn?.trim() || faq.questionEn,
                answerEn: item.answerEn?.trim() || faq.answerEn,
            } : faq;
        }));
        setItinerary(prev => prev.map((day, index) => {
            const item = findTranslationItem(translation.itinerary, index);
            return item ? {
                ...day,
                titleEn: item.titleEn?.trim() || day.titleEn,
                descriptionEn: item.descriptionEn?.trim() || day.descriptionEn,
                accommodationEn: item.accommodationEn?.trim() || day.accommodationEn,
                transportEn: item.transportEn?.trim() || day.transportEn,
                activitiesEnText: item.activitiesEn?.length ? item.activitiesEn.join('\n') : day.activitiesEnText,
                timelineEnItems: item.timelineEn?.length ? normalizeTimelineEntries(item.timelineEn) : day.timelineEnItems,
                timelineEnText: item.timelineEn?.length ? timelineToText(item.timelineEn) : day.timelineEnText,
            } : day;
        }));
        setShowEnglishFields(true);
        setIsDirty(true);
    };

    const handleGenerateEnglishDraft = async () => {
        const payload = buildEnglishTranslationPayload();
        setIsTranslatingEnglish(true);
        setGlobalError('');
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/ai/translate/tour`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => null);
            if (!response.ok) {
                const message = Array.isArray(result?.message)
                    ? result.message.join(', ')
                    : result?.message || 'Không thể tạo bản tiếng Anh tự động.';
                throw new Error(message);
            }
            applyEnglishTranslation((result?.data ?? result) as TourEnglishTranslation);
        } catch (error) {
            setGlobalError(error instanceof Error ? error.message : 'Không thể tạo bản tiếng Anh tự động.');
        } finally {
            setIsTranslatingEnglish(false);
        }
    };

    // ── Validate ─────────────────────────────────────────────────────
    const validateForReview = (): boolean => {
        setGlobalError('');
        const readiness = getReviewReadiness();
        const newErrors: Partial<TourFormData> = {};

        readiness.required.forEach(item => {
            if (!item.done && item.field) newErrors[item.field] = item.error;
        });

        setErrors(newErrors);

        if (readiness.missingRequired.length > 0) {
            const actionLabel = isStaff ? 'gửi duyệt' : 'public';
            setGlobalError(`Vui lòng hoàn thiện trước khi ${actionLabel}: ${readiness.missingRequired.map(item => item.label).join(', ')}.`);
            focusReviewIssue(readiness.missingRequired[0]);
            return false;
        }

        return true;
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
                throw new Error(normalizeTourMessage(err.message, 'Có lỗi xảy ra khi lưu tour. Vui lòng thử lại.'));
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

            if (tourId) {
                const highlightPayload = highlights
                    .filter(h => h.content.trim())
                    .map((h, i) => ({
                        content: h.content.trim(),
                        contentEn: h.contentEn.trim() || undefined,
                        icon: h.icon || 'auto_awesome',
                        sortOrder: i,
                    }));
                const faqPayload = faqs
                    .filter(f => f.question.trim() && f.answer.trim())
                    .map((f, i) => ({
                        question: f.question.trim(),
                        questionEn: f.questionEn.trim() || undefined,
                        answer: f.answer.trim(),
                        answerEn: f.answerEn.trim() || undefined,
                        sortOrder: i,
                    }));
                const itineraryPayload = itinerary
                    .filter(day => day.title.trim() && day.description.trim())
                    .map((day, i) => ({
                        dayNumber: i + 1,
                        title: day.title.trim(),
                        titleEn: day.titleEn.trim() || undefined,
                        description: day.description.trim(),
                        descriptionEn: day.descriptionEn.trim() || undefined,
                        mealsBreakfast: day.mealsBreakfast,
                        mealsLunch: day.mealsLunch,
                        mealsDinner: day.mealsDinner,
                        accommodation: day.accommodation.trim() || undefined,
                        accommodationEn: day.accommodationEn.trim() || undefined,
                        transport: day.transport.trim() || undefined,
                        transportEn: day.transportEn.trim() || undefined,
                        activities: splitLines(day.activitiesText),
                        activitiesEn: splitLines(day.activitiesEnText),
                        timeline: cleanTimelineEntries(day.timelineItems),
                        timelineEn: cleanTimelineEntries(day.timelineEnItems),
                    }));
                const contentSyncs: Promise<{ label: string; response: Response }>[] = [];

                if (highlights.length > 0 || initialData?.highlights !== undefined) {
                    contentSyncs.push(fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/highlights`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ highlights: highlightPayload }),
                    }).then(response => ({ label: 'điểm nổi bật', response })));
                }

                if (faqs.length > 0 || initialData?.faqs !== undefined) {
                    contentSyncs.push(fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/faqs`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ faqs: faqPayload }),
                    }).then(response => ({ label: 'FAQ', response })));
                }

                if (itinerary.length > 0 || initialData?.itinerary !== undefined) {
                    contentSyncs.push(fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/itinerary`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ itinerary: itineraryPayload }),
                    }).then(response => ({ label: 'lịch trình', response })));
                }

                const contentResponses = await Promise.all(contentSyncs);
                for (const { label, response: contentResponse } of contentResponses) {
                    if (!contentResponse.ok) {
                        const err = await contentResponse.json().catch(() => ({}));
                        throw new Error(normalizeTourMessage(err.message, `Không thể lưu ${label}`));
                    }
                }
            }

            if (isStaff && action === 'submit' && tourId) {
                const submitRes = await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/submit`, { method: 'POST' });
                if (!submitRes.ok) {
                    const err = await submitRes.json().catch(() => ({}));
                    throw new Error(normalizeTourMessage(err.message, 'Gửi duyệt thất bại'));
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
                    throw new Error(normalizeTourMessage(err.message, 'Public tour thất bại'));
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
            setGlobalError(normalizeTourMessage(err instanceof Error ? err.message : undefined));
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
    const readiness = getReviewReadiness();
    const requiredChecklist = readiness.required;
    const recommendedChecklist = readiness.recommended;
    const missingRequired = readiness.missingRequired;
    const requiredDoneCount = readiness.completedRequired;
    const requiredProgress = Math.round((requiredDoneCount / requiredChecklist.length) * 100);
    const isReadyForReview = missingRequired.length === 0;
    const readinessToneClass = isReadyForReview ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700';
    const hasDepartureReviewError = Boolean(errors.startDate);
    const sectionIssueCounts = requiredChecklist.reduce<Record<string, number>>((acc, item) => {
        if (!item.done) acc[item.target] = (acc[item.target] ?? 0) + 1;
        return acc;
    }, {});
    const editorSections = [
        { id: 'tour-section-basic', icon: 'info', label: 'Thông tin cơ bản' },
        { id: 'tour-section-location', icon: 'location_on', label: 'Địa điểm & thời lượng' },
        { id: 'tour-section-pricing', icon: 'payments', label: 'Giá & số lượng' },
        { id: 'tour-section-departures', icon: 'calendar_month', label: 'Ngày khởi hành' },
        { id: 'tour-section-cover', icon: 'image', label: 'Ảnh bìa' },
        { id: 'tour-section-gallery', icon: 'photo_library', label: 'Gallery' },
        { id: 'tour-section-packages', icon: 'package_2', label: 'Gói tour' },
        { id: 'tour-section-highlights', icon: 'auto_awesome', label: 'Điểm nổi bật' },
        { id: 'tour-section-faqs', icon: 'help_outline', label: 'FAQ' },
        { id: 'tour-section-itinerary', icon: 'route', label: 'Lịch trình' },
    ];
    const scrollToSection = (sectionId: string) => {
        document.getElementById(sectionId)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    const reviewRequirementText = isStaff ? 'Bắt buộc khi gửi duyệt' : 'Bắt buộc khi public';
    const finalActionText = isStaff ? 'Gửi duyệt' : 'Xác nhận public';
    const englishFieldClass = showEnglishFields ? '' : 'hidden';
    const bilingualGridClass = showEnglishFields ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3';
    const hasEnglishTranslationSource = Boolean(
        form.name.trim() ||
        form.description.trim() ||
        form.departurePoint.trim() ||
        (durationMode === 'custom' ? customDuration.trim() : form.duration.trim()) ||
        packages.some(pkg => pkg.name.trim() || pkg.description.trim() || pkg.includes.length || pkg.excludes.length) ||
        departures.some(departure => departure.note.trim()) ||
        highlights.some(highlight => highlight.content.trim()) ||
        faqs.some(faq => faq.question.trim() || faq.answer.trim()) ||
        itinerary.some(day =>
            day.title.trim() ||
            day.description.trim() ||
            day.accommodation.trim() ||
            day.transport.trim() ||
            day.activitiesText.trim() ||
            cleanTimelineEntries(day.timelineItems).length > 0
        )
    );
    const selectedDestination = destinations.find(destination => String(destination.id) === form.destinationId);
    const destinationSearchTerm = normalizeSearchValue(destinationQuery.replace(/·.*/, ''));
    const filteredDestinations = destinations
        .filter(destination => {
            if (!destinationSearchTerm) return true;
            return normalizeSearchValue(getDestinationLabel(destination)).includes(destinationSearchTerm);
        })
        .slice(0, 8);
    const departureSearchTerm = normalizeSearchValue(departurePointQuery);
    const filteredDeparturePoints = DEPARTURE_POINTS
        .filter(point => !departureSearchTerm || normalizeSearchValue(point).includes(departureSearchTerm))
        .slice(0, 8);
    const selectedDurationLabel = durationMode === 'custom'
        ? 'Khác (tùy chỉnh)'
        : form.duration || 'Chọn thời lượng...';
    const requiredBadge = (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-primary">
            {reviewRequirementText}
        </span>
    );
    const recommendedBadge = (
        <span className="inline-flex items-center rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-on-surface-variant">
            Khuyến nghị
        </span>
    );
    const helperTextClass = 'mt-1.5 text-[11px] leading-relaxed text-on-surface-variant/65';
    const labelWithBadgeClass = 'mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant';
    const compactLabelWithBadgeClass = 'mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant';

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
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
            style={{ overscrollBehavior: 'contain' }}
            role="dialog" aria-modal="true" aria-labelledby="modal-title"
        >
            {/* Global Error Toast (Top Right) */}
            {globalError && (
                <div className="fixed left-4 right-4 top-4 sm:left-auto sm:right-6 sm:top-6 z-[60] flex items-start gap-3.5 p-4 bg-white border border-error/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl sm:w-[380px] animate-fade-slide-up">
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
            <div className="relative w-full max-w-6xl h-[94vh] sm:h-[92vh] max-h-[94vh] sm:max-h-[92vh] flex flex-col bg-surface-container-lowest rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-fade-slide-up">

                {/* ── Hero Header ── */}
                <div className="relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '50px 50px, 35px 35px' }} />
                    <div className="relative z-[1] px-5 py-5 sm:px-7 sm:py-6 flex items-center justify-between gap-4">
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

                <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
                    <aside className="hidden lg:flex min-h-0 flex-col border-r border-outline-variant/10 bg-surface-container-low/45">
                        <div className="p-5 border-b border-outline-variant/10">
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-on-surface-variant/70">Sẵn sàng gửi duyệt</p>
                            <div className="mt-3 flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-2xl font-black text-on-surface">{requiredDoneCount}/{requiredChecklist.length}</p>
                                    <p className="text-xs text-on-surface-variant mt-0.5">
                                        {isReadyForReview ? 'Đủ điều kiện gửi duyệt' : `${missingRequired.length} mục còn thiếu`}
                                    </p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${readinessToneClass}`}>{requiredProgress}%</span>
                            </div>
                            <div className="mt-4 h-2 rounded-full bg-outline-variant/20 overflow-hidden">
                                <div className={`h-full rounded-full transition-[width] duration-300 ${isReadyForReview ? 'bg-emerald-600' : 'bg-primary'}`} style={{ width: `${requiredProgress}%` }} />
                            </div>
                            {!isReadyForReview && (
                                <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-500/10 p-3">
                                    <p className="text-xs font-bold text-amber-800">Cần hoàn thiện trước khi gửi</p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-amber-800/80">
                                        {missingRequired.slice(0, 3).map(item => item.label).join(', ')}
                                        {missingRequired.length > 3 ? ` và ${missingRequired.length - 3} mục khác` : ''}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => scrollToSection(missingRequired[0].target)}
                                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900"
                                    >
                                        Đi tới mục đầu tiên
                                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
                            <div>
                                <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Đi tới phần</p>
                                <div className="mt-2 space-y-1">
                                    {editorSections.map(section => {
                                        const issueCount = sectionIssueCounts[section.id] ?? 0;
                                        return (
                                        <button
                                            key={section.id}
                                            type="button"
                                            onClick={() => scrollToSection(section.id)}
                                            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-on-surface-variant hover:bg-surface-container-lowest hover:text-primary transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[15px]">{section.icon}</span>
                                            <span className="truncate">{section.label}</span>
                                            {issueCount > 0 && (
                                                <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-700">{issueCount}</span>
                                            )}
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Bắt buộc</p>
                                <div className="mt-2 space-y-1.5">
                                    {requiredChecklist.map(item => (
                                        <button
                                            key={item.label}
                                            type="button"
                                            title={item.hint}
                                            onClick={() => scrollToSection(item.target)}
                                            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-surface-container-lowest transition-colors"
                                        >
                                            <span className={`material-symbols-outlined text-[16px] ${item.done ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {item.done ? 'check_circle' : 'error'}
                                            </span>
                                            <span className={item.done ? 'text-on-surface' : 'text-on-surface-variant'}>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Nên có</p>
                                <div className="mt-2 space-y-1.5">
                                    {recommendedChecklist.map(item => (
                                        <button
                                            key={item.label}
                                            type="button"
                                            title={item.hint}
                                            onClick={() => scrollToSection(item.target)}
                                            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-surface-container-lowest transition-colors"
                                        >
                                            <span className={`material-symbols-outlined text-[16px] ${item.done ? 'text-primary' : 'text-on-surface-variant/35'}`}>
                                                {item.done ? 'task_alt' : 'add_circle'}
                                            </span>
                                            <span className={item.done ? 'text-on-surface' : 'text-on-surface-variant'}>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div className="min-h-0 flex flex-col">
                {/* ── Form Body ── */}
                <form id="tour-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 scroll-smooth px-5 py-5 sm:px-7 lg:px-8 lg:py-6 space-y-6 sm:space-y-7" noValidate>

                    <div className="lg:hidden rounded-2xl border border-outline-variant/15 bg-surface-container-low/50 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-on-surface-variant/70">Sẵn sàng gửi duyệt</p>
                                <p className="text-sm font-bold text-on-surface mt-1">
                                    {isReadyForReview
                                        ? 'Đủ điều kiện gửi duyệt'
                                        : `${requiredDoneCount}/${requiredChecklist.length} mục bắt buộc đã đủ`}
                                </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${readinessToneClass}`}>{requiredProgress}%</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-outline-variant/20 overflow-hidden">
                            <div className={`h-full rounded-full transition-[width] duration-300 ${isReadyForReview ? 'bg-emerald-600' : 'bg-primary'}`} style={{ width: `${requiredProgress}%` }} />
                        </div>
                        {!isReadyForReview && (
                            <p className="mt-3 text-[11px] leading-relaxed text-amber-700">
                                Còn thiếu: {missingRequired.slice(0, 3).map(item => item.label).join(', ')}
                                {missingRequired.length > 3 ? ` và ${missingRequired.length - 3} mục khác` : ''}.
                            </p>
                        )}
                    </div>

                    {/* ─── Section 1: Thông tin cơ bản ─── */}
                    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low/45 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <span className="material-symbols-outlined text-[17px]">translate</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-on-surface">Bản dịch tiếng Anh là tùy chọn</p>
                                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                                    Staff chỉ cần nhập tiếng Việt. Khi khách xem trang tiếng Anh, hệ thống sẽ dùng bản English nếu có, nếu không sẽ tự fallback từ nội dung tiếng Việt.
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto sm:flex-row">
                            <button
                                type="button"
                                onClick={handleGenerateEnglishDraft}
                                disabled={!hasEnglishTranslationSource || isTranslatingEnglish}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary outline-none disabled:cursor-not-allowed disabled:bg-outline-variant/40 disabled:text-on-surface-variant sm:w-auto"
                            >
                                <span className={`material-symbols-outlined text-[17px] ${isTranslatingEnglish ? 'animate-spin' : ''}`}>
                                    {isTranslatingEnglish ? 'progress_activity' : 'auto_awesome'}
                                </span>
                                {isTranslatingEnglish ? 'Đang tạo...' : 'Tự tạo bản tiếng Anh'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowEnglishFields(value => !value)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface hover:text-primary focus-visible:ring-2 focus-visible:ring-primary outline-none sm:w-auto"
                                aria-expanded={showEnglishFields}
                            >
                                <span className="material-symbols-outlined text-[17px]">{showEnglishFields ? 'visibility_off' : 'edit_note'}</span>
                                {showEnglishFields ? 'Ẩn bản dịch' : 'Chỉnh bản tiếng Anh'}
                            </button>
                        </div>
                    </div>

                    <div id="tour-section-basic" className="scroll-mt-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[14px]">info</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Thông tin cơ bản</h3>
                        </div>

                        <div className="space-y-4 bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10">
                            {/* Tour Name */}
                            <div>
                                <label htmlFor="field-name" className={labelWithBadgeClass}>
                                    <span>Tên tour</span>
                                    {requiredBadge}
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">travel_explore</span>
                                    <input
                                        ref={firstInputRef}
                                        id="field-name"
                                        name="name"
                                        type="text"
                                        aria-invalid={Boolean(errors.name)}
                                        aria-describedby={errors.name ? 'field-name-error' : undefined}
                                        autoComplete="off"
                                        placeholder="Ví dụ: Hạ Long: Du thuyền 5 sao kèm ăn trưa"
                                        value={form.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                        className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.name ? 'border-error' : 'border-outline-variant/20'}`}
                                    />
                                </div>
                                <p className={helperTextClass}>
                                    Nên có điểm đến, loại trải nghiệm và điểm nổi bật. Ví dụ: Hạ Long: Du thuyền 5 sao kèm ăn trưa.
                                </p>
                                {errors.name && (
                                    <p className="text-error text-xs mt-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">error</span><span id="field-name-error">{errors.name}</span>
                                    </p>
                                )}
                            </div>

                            <div className={englishFieldClass}>
                                <label htmlFor="field-nameEn" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Tên tour tiếng Anh
                                </label>
                                <input
                                    id="field-nameEn"
                                    name="nameEn"
                                    type="text"
                                    autoComplete="off"
                                    placeholder="Example: Ha Long Bay 5-Star Lunch Cruise"
                                    value={form.nameEn}
                                    onChange={e => handleChange('nameEn', e.target.value)}
                                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                                />
                            </div>

                            {/* Tour Type */}
                            <div>
                                <label htmlFor="field-tourType" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Nhóm hiển thị chính</label>
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
                                <p className={helperTextClass}>Chọn 1 nhóm chính để khách dễ lọc và hiểu phong cách tour.</p>
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="field-description" className={labelWithBadgeClass}>
                                    <span>Mô tả</span>
                                    {requiredBadge}
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-on-surface-variant/60 text-base pointer-events-none">description</span>
                                    <textarea
                                        id="field-description"
                                        name="description"
                                        aria-invalid={Boolean(errors.description)}
                                        aria-describedby={errors.description ? 'field-description-error' : undefined}
                                        autoComplete="off"
                                        placeholder="Mô tả chi tiết về trải nghiệm tour này…"
                                        rows={3}
                                        value={form.description}
                                        onChange={e => handleChange('description', e.target.value)}
                                        className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors resize-none ${errors.description ? 'border-error' : 'border-outline-variant/20'}`}
                                    />
                                </div>
                                <p className={helperTextClass}>Viết 2-4 câu: khách sẽ đi đâu, trải nghiệm gì, tour phù hợp với ai.</p>
                                {errors.description && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span><span id="field-description-error">{errors.description}</span></p>}
                            </div>

                            <div className={englishFieldClass}>
                                <label htmlFor="field-descriptionEn" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Mô tả tiếng Anh
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

                    {/* ─── Section 2: Địa điểm & thời lượng ─── */}
                    <div id="tour-section-location" className="scroll-mt-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-violet-600 text-[14px]">location_on</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Địa điểm & thời lượng</h3>
                        </div>

                        <div className="space-y-4 bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10">

                            {/* Destination */}
                            <div>
                                <label htmlFor="field-destinationId" className={labelWithBadgeClass}>
                                    <span>Điểm đến</span>
                                    {requiredBadge}
                                </label>
                                {!showNewDest ? (
                                    <>
                                        <div
                                            className="relative"
                                            onBlur={() => window.setTimeout(() => setIsDestinationListOpen(false), 120)}
                                        >
                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">map</span>
                                            <input
                                                id="field-destinationId"
                                                name="destinationId"
                                                type="text"
                                                aria-invalid={Boolean(errors.destinationId)}
                                                aria-describedby={errors.destinationId ? 'field-destinationId-error' : undefined}
                                                role="combobox"
                                                aria-expanded={isDestinationListOpen}
                                                aria-controls="destination-options"
                                                autoComplete="off"
                                                placeholder="Gõ để tìm điểm đến..."
                                                value={destinationQuery}
                                                onFocus={() => setIsDestinationListOpen(true)}
                                                onChange={e => {
                                                    const value = e.target.value;
                                                    setDestinationQuery(value);
                                                    setIsDestinationListOpen(true);
                                                    if (form.destinationId && selectedDestination && value !== getDestinationLabel(selectedDestination)) {
                                                        handleChange('destinationId', '');
                                                    }
                                                }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Escape') setIsDestinationListOpen(false);
                                                    if (e.key === 'Enter' && filteredDestinations.length > 0) {
                                                        e.preventDefault();
                                                        selectDestination(filteredDestinations[0]);
                                                    }
                                                }}
                                                className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-20 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.destinationId ? 'border-error' : 'border-outline-variant/20'}`}
                                            />
                                            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                                                {destinationQuery && (
                                                    <button
                                                        type="button"
                                                        onMouseDown={e => e.preventDefault()}
                                                        onClick={clearDestination}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-error"
                                                        aria-label="Xóa điểm đến"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                    </button>
                                                )}
                                                <span className="material-symbols-outlined text-on-surface-variant/40 text-base pointer-events-none">expand_more</span>
                                            </div>
                                            {isDestinationListOpen && (
                                                <div
                                                    id="destination-options"
                                                    role="listbox"
                                                    className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                                                >
                                                    {filteredDestinations.length > 0 ? filteredDestinations.map(destination => {
                                                        const active = String(destination.id) === form.destinationId;
                                                        return (
                                                            <button
                                                                key={destination.id}
                                                                type="button"
                                                                role="option"
                                                                aria-selected={active}
                                                                onMouseDown={e => e.preventDefault()}
                                                                onClick={() => selectDestination(destination)}
                                                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container'}`}
                                                            >
                                                                <span className="flex min-w-0 items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">travel_explore</span>
                                                                    <span className="truncate font-semibold">{destination.name}</span>
                                                                </span>
                                                                <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                                                                    {(destination.travelScope ?? 'DOMESTIC') === 'DOMESTIC' ? 'Trong nước' : 'Nước ngoài'}
                                                                </span>
                                                            </button>
                                                        );
                                                    }) : (
                                                        <div className="px-3 py-3 text-xs text-on-surface-variant">
                                                            Không tìm thấy điểm đến. Có thể tạo mới bên dưới.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className={helperTextClass}>Dùng cho bộ lọc điểm đến và hiển thị trên trang khách hàng.</p>
                                        {errors.destinationId && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span><span id="field-destinationId-error">{errors.destinationId}</span></p>}
                                        {/* Create new destination button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewDestName(destinationQuery.replace(/·.*/, '').trim());
                                                setShowNewDest(true);
                                            }}
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

                            {/* Departure Point */}
                            <div>
                                <label htmlFor="field-departurePoint" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                                    Điểm Khởi Hành Mặc Định
                                </label>

                                <div
                                    className="relative"
                                    onBlur={() => window.setTimeout(() => setIsDeparturePointListOpen(false), 120)}
                                >
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">flight_takeoff</span>
                                    <input
                                        id="field-departurePoint"
                                        type="text"
                                        role="combobox"
                                        aria-expanded={isDeparturePointListOpen}
                                        aria-controls="departure-point-options"
                                        autoComplete="off"
                                        placeholder="Gõ hoặc chọn điểm khởi hành..."
                                        value={departurePointQuery}
                                        onFocus={() => setIsDeparturePointListOpen(true)}
                                        onChange={e => {
                                            const value = e.target.value;
                                            setDeparturePointQuery(value);
                                            setIsDeparturePointListOpen(true);
                                            handleChange('departurePoint', value);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') setIsDeparturePointListOpen(false);
                                            if (e.key === 'Enter' && filteredDeparturePoints.length > 0) {
                                                e.preventDefault();
                                                selectDeparturePoint(filteredDeparturePoints[0]);
                                            }
                                        }}
                                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-11 pr-20 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                                    />
                                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                                        {departurePointQuery && (
                                            <button
                                                type="button"
                                                onMouseDown={e => e.preventDefault()}
                                                onClick={clearDeparturePoint}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-error"
                                                aria-label="Xóa điểm khởi hành"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        )}
                                        <span className="material-symbols-outlined text-on-surface-variant/40 text-base pointer-events-none">expand_more</span>
                                    </div>
                                    {isDeparturePointListOpen && (
                                        <div
                                            id="departure-point-options"
                                            role="listbox"
                                            className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                                        >
                                            {filteredDeparturePoints.length > 0 && filteredDeparturePoints.map(point => {
                                                const active = point === form.departurePoint;
                                                return (
                                                    <button
                                                        key={point}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={active}
                                                        onMouseDown={e => e.preventDefault()}
                                                        onClick={() => selectDeparturePoint(point)}
                                                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">location_on</span>
                                                        <span className="truncate">{point}</span>
                                                    </button>
                                                );
                                            })}
                                            {departurePointQuery.trim() && !DEPARTURE_POINTS.some(point => point.toLowerCase() === departurePointQuery.trim().toLowerCase()) && (
                                                <div className="mt-1 border-t border-outline-variant/10 pt-1">
                                                    <button
                                                        type="button"
                                                        onMouseDown={e => e.preventDefault()}
                                                        onClick={() => selectDeparturePoint(departurePointQuery.trim())}
                                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-primary hover:bg-primary/10"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                                                        <span>Dùng &quot;{departurePointQuery.trim()}&quot;</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <p className="text-[11px] text-on-surface-variant/60 mt-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[11px]">info</span>
                                    Hiển thị trên trang chi tiết tour cho khách hàng
                                </p>
                                <input
                                    type="text"
                                    value={form.departurePointEn}
                                    onChange={e => handleChange('departurePointEn', e.target.value)}
                                    placeholder="Departure point in English"
                                    className={`mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${englishFieldClass}`}
                                />
                            </div>

                            {/* Duration */}
                            <div className="grid grid-cols-1 gap-4">
                                {/* Duration */}
                                <div>
                                    <label className={labelWithBadgeClass}>
                                        <span>Thời lượng</span>
                                        {requiredBadge}
                                    </label>
                                    <div className="space-y-2">
                                        <div
                                            className="relative"
                                            onBlur={() => window.setTimeout(() => setIsDurationListOpen(false), 120)}
                                        >
                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">schedule</span>
                                            <button
                                                type="button"
                                                id="field-duration"
                                                aria-describedby={errors.duration ? 'field-duration-error' : undefined}
                                                aria-expanded={isDurationListOpen}
                                                aria-controls="duration-options"
                                                onClick={() => setIsDurationListOpen(open => !open)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Escape') setIsDurationListOpen(false);
                                                    if (e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        setIsDurationListOpen(true);
                                                    }
                                                }}
                                                className={`flex w-full items-center rounded-xl border bg-surface-container-lowest py-3 pl-11 pr-10 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${errors.duration ? 'border-error' : 'border-outline-variant/20'} ${form.duration || durationMode === 'custom' ? 'text-on-surface' : 'text-on-surface-variant/60'}`}
                                            >
                                                {selectedDurationLabel}
                                            </button>
                                            <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-base pointer-events-none transition-transform ${isDurationListOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                            {isDurationListOpen && (
                                                <div
                                                    id="duration-options"
                                                    role="listbox"
                                                    className="absolute z-30 mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                                                >
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        aria-selected={!form.duration && durationMode !== 'custom'}
                                                        onMouseDown={e => e.preventDefault()}
                                                        onClick={() => handleDurationSelect('')}
                                                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${!form.duration && durationMode !== 'custom' ? 'bg-primary/10 text-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">event_busy</span>
                                                        Chọn thời lượng...
                                                    </button>
                                                    {DURATION_PRESETS.map(duration => {
                                                        const active = durationMode === 'custom'
                                                            ? duration === 'Khác (tùy chỉnh)'
                                                            : form.duration === duration;
                                                        const isCustom = duration === 'Khác (tùy chỉnh)';
                                                        return (
                                                            <button
                                                                key={duration}
                                                                type="button"
                                                                role="option"
                                                                aria-selected={active}
                                                                onMouseDown={e => e.preventDefault()}
                                                                onClick={() => handleDurationSelect(duration)}
                                                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'text-on-surface hover:bg-surface-container'}`}
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[16px]">{isCustom ? 'edit_calendar' : 'date_range'}</span>
                                                                    {duration}
                                                                </span>
                                                                {active && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        {/* Custom duration input */}
                                        {durationMode === 'custom' && (
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">edit</span>
                                                <input
                                                    type="text"
                                                    aria-invalid={Boolean(errors.duration)}
                                                    aria-describedby={errors.duration ? 'field-duration-error' : undefined}
                                                    value={customDuration}
                                                    onChange={e => { setCustomDuration(e.target.value); setErrors(p => ({ ...p, duration: undefined })); }}
                                                    placeholder="Ví dụ: 10 Ngày 9 Đêm…"
                                                    className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.duration ? 'border-error' : 'border-primary/30'}`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <p className={helperTextClass}>Hiển thị trực tiếp trên card tour, nên dùng format ngắn như 3 ngày 2 đêm.</p>
                                    {errors.duration && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span><span id="field-duration-error">{errors.duration}</span></p>}
                                    <input
                                        type="text"
                                        value={form.durationEn}
                                        onChange={e => handleChange('durationEn', e.target.value)}
                                        placeholder="Duration in English, e.g. 3 Days 2 Nights"
                                        className={`mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${englishFieldClass}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Section 3: Giá & Số lượng ─── */}
                    <div id="tour-section-pricing" className="scroll-mt-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-amber-600 text-[14px]">payments</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Giá & Số lượng</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10">
                            {/* Price */}
                            <div>
                                <label htmlFor="field-price" className={labelWithBadgeClass}>
                                    <span>Giá niêm yết</span>
                                    {requiredBadge}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-sm pointer-events-none">₫</span>
                                    <input
                                        id="field-price"
                                        name="price"
                                        type="text"
                                        aria-invalid={Boolean(errors.price)}
                                        aria-describedby={errors.price ? 'field-price-error' : undefined}
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="Ví dụ: 2.500.000"
                                        value={formatCurrencyInput(form.price)}
                                        onChange={e => handleChange('price', stripCurrencyInput(e.target.value))}
                                        className={`w-full bg-surface-container-lowest border rounded-xl pl-9 pr-16 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.price ? 'border-error' : 'border-outline-variant/20'}`}
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md pointer-events-none tracking-wide">
                                        VNĐ
                                    </span>
                                </div>
                                <p className={helperTextClass}>Giá cơ bản mỗi khách. Ngày khởi hành hoặc gói tour có thể có giá riêng.</p>
                                {errors.price && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span><span id="field-price-error">{errors.price}</span></p>}
                            </div>

                            {/* Available Seats */}
                            <div>
                                <label htmlFor="field-availableSeats" className={labelWithBadgeClass}>
                                    <span>Số ghế mặc định</span>
                                    {requiredBadge}
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-base pointer-events-none">airline_seat_recline_normal</span>
                                    <input
                                        id="field-availableSeats"
                                        name="availableSeats"
                                        type="number"
                                        aria-invalid={Boolean(errors.availableSeats)}
                                        aria-describedby={errors.availableSeats ? 'field-availableSeats-error' : undefined}
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="20"
                                        min="1"
                                        value={form.availableSeats}
                                        onChange={e => handleChange('availableSeats', e.target.value)}
                                        className={`w-full bg-surface-container-lowest border rounded-xl pl-11 pr-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors ${errors.availableSeats ? 'border-error' : 'border-outline-variant/20'}`}
                                    />
                                </div>
                                <p className={helperTextClass}>Dùng làm sức chứa mặc định nếu ngày khởi hành chưa đặt số ghế riêng.</p>
                                {errors.availableSeats && <p className="text-error text-xs mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span><span id="field-availableSeats-error">{errors.availableSeats}</span></p>}
                            </div>
                        </div>
                    </div>

                    {/* ─── Section 4: Ngày Khởi Hành ─── */}
                    <div id="tour-section-departures" className="scroll-mt-6 outline-none" tabIndex={-1}>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 text-[14px]">calendar_month</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Ngày khởi hành</h3>
                            <span className="text-[10px] font-bold text-primary">Cần ít nhất 1 chuyến hợp lệ</span>
                        </div>
                        {hasDepartureReviewError && (
                            <div className="mb-3 rounded-2xl border border-amber-300/40 bg-amber-500/10 p-3 text-xs text-amber-800" role="alert">
                                <p className="font-bold flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[15px]">error</span>
                                    Chưa có chuyến khởi hành hợp lệ
                                </p>
                                <p id="field-startDate-error" className="mt-1 leading-relaxed">{errors.startDate}</p>
                            </div>
                        )}
                        <div className="space-y-3">
                            {departures.map((dep, idx) => {
                                const departureInvalid = hasDepartureReviewError
                                    && (!dep.departureDate || !isBookableDepartureDate(dep.departureDate) || Number(dep.availableSeats || 0) <= 0);
                                return (
                                <div key={idx} className={`bg-surface-container-low/40 rounded-2xl p-4 border ${departureInvalid ? 'border-amber-300/60 bg-amber-500/5' : 'border-outline-variant/10'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Chuyến #{idx + 1}</span>
                                        <button type="button" onClick={() => { setDepartures(d => d.filter((_, i) => i !== idx)); setErrors(prev => ({ ...prev, startDate: undefined })); setIsDirty(true); }}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className={compactLabelWithBadgeClass}>
                                                <span>Ngày khởi hành</span>
                                                {requiredBadge}
                                            </label>
                                            <DatePickerDropdown
                                                value={dep.departureDate}
                                                minDate={MIN_START_DATE}
                                                language="vi"
                                                variant="field"
                                                placeholder="Chọn ngày khởi hành"
                                                onChange={value => updateDeparture(idx, { departureDate: value })}
                                            />
                                            {departureInvalid && (!dep.departureDate || !isBookableDepartureDate(dep.departureDate)) && (
                                                <p className="mt-1 text-[10px] text-amber-700">Cần chọn ngày hợp lệ, không ở quá khứ.</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Phân loại (Sale)</label>
                                            <select value={dep.category}
                                                onChange={e => updateDepartureCategory(idx, e.target.value as SaleCategory)}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                                <option value="all">Bình thường</option>
                                                <option value="flash">Flash Sale</option>
                                                <option value="early">Đặt Sớm</option>
                                                <option value="lastminute">Giờ Chót</option>
                                            </select>
                                        </div>
                                        {dep.category === 'flash' && (
                                            <div className="sm:col-span-2">
                                                <label className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-error">
                                                    <span className="material-symbols-outlined text-[14px]">timer</span>
                                                    Kết thúc Flash Sale *
                                                </label>
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_168px]">
                                                    <DatePickerDropdown
                                                        value={getDatePart(dep.flashSaleEndsAt)}
                                                        minDate={MIN_START_DATE}
                                                        language="vi"
                                                        variant="field"
                                                        placeholder={dep.departureDate ? 'Chọn ngày kết thúc sale' : 'Chọn ngày kết thúc'}
                                                        onChange={value => updateFlashSaleDate(idx, value)}
                                                        dropdownClassName="z-[350]"
                                                    />
                                                    <div
                                                        className="relative"
                                                        onBlur={() => window.setTimeout(() => setOpenFlashTimeIndex(null), 120)}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenFlashTimeIndex(open => open === idx ? null : idx)}
                                                            className="flex h-[42px] w-full items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-3 py-2.5 text-left text-sm font-semibold text-error outline-none transition-colors hover:bg-error/10 focus-visible:ring-2 focus-visible:ring-error"
                                                            aria-expanded={openFlashTimeIndex === idx}
                                                            aria-controls={`flash-sale-time-options-${idx}`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[17px]">schedule</span>
                                                                {getTimePart(dep.flashSaleEndsAt) || '23:59'}
                                                            </span>
                                                            <span className={`material-symbols-outlined text-[18px] transition-transform ${openFlashTimeIndex === idx ? 'rotate-180' : ''}`}>expand_more</span>
                                                        </button>
                                                        {openFlashTimeIndex === idx && (
                                                            <div
                                                                id={`flash-sale-time-options-${idx}`}
                                                                role="listbox"
                                                                className="absolute right-0 z-[360] mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl sm:w-52"
                                                            >
                                                                {FLASH_SALE_TIME_OPTIONS.map(time => {
                                                                    const active = (getTimePart(dep.flashSaleEndsAt) || '23:59') === time;
                                                                    return (
                                                                        <button
                                                                            key={time}
                                                                            type="button"
                                                                            role="option"
                                                                            aria-selected={active}
                                                                            onMouseDown={e => e.preventDefault()}
                                                                            onClick={() => updateFlashSaleTime(idx, time)}
                                                                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${active ? 'bg-error text-white font-semibold' : 'text-on-surface hover:bg-surface-container'}`}
                                                                        >
                                                                            <span>{time}</span>
                                                                            {active && <span className="material-symbols-outlined text-[15px]">check</span>}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="mt-1.5 text-[10px] text-on-surface-variant/60">Ngày dùng cùng bộ chọn ngày của form. Giờ có thể chọn nhanh theo mốc 30 phút.</p>
                                            </div>
                                        )}
                                        <div>
                                            <label className={compactLabelWithBadgeClass}>
                                                <span>Số ghế còn</span>
                                                {requiredBadge}
                                            </label>
                                            <input type="number" placeholder="VD: 20" min={0} value={dep.availableSeats}
                                                aria-invalid={departureInvalid && Number(dep.availableSeats || 0) <= 0}
                                                aria-describedby={hasDepartureReviewError ? 'field-startDate-error' : undefined}
                                                onChange={e => updateDeparture(idx, { availableSeats: e.target.value })}
                                                className={`w-full bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary ${departureInvalid && Number(dep.availableSeats || 0) <= 0 ? 'border-amber-400' : 'border-outline-variant/20'}`} />
                                            <p className="mt-1 text-[10px] text-on-surface-variant/60">Phải lớn hơn 0 để chuyến được tính là hợp lệ.</p>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tổng số ghế (Max)</label>
                                            <input type="number" placeholder="VD: 30" min={0} value={dep.maxSeats}
                                                onChange={e => updateDeparture(idx, { maxSeats: e.target.value })}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Giá riêng (VNĐ)</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder={`Mặc định: ${formatCurrencyInput(form.price) || 'giá tour'}`}
                                                value={formatCurrencyInput(dep.price)}
                                                onChange={e => updateDeparture(idx, { price: stripCurrencyInput(e.target.value) })}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Ghi chú</label>
                                            <input type="text" placeholder="Giá ưu đãi cuối tuần..." value={dep.note}
                                                onChange={e => updateDeparture(idx, { note: e.target.value })}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div className={englishFieldClass}>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Note (English)</label>
                                            <input type="text" placeholder="Weekend deal..." value={dep.noteEn}
                                                onChange={e => updateDeparture(idx, { noteEn: e.target.value })}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                            <button type="button"
                                onClick={() => { setDepartures(d => [...d, createEmptyDeparture()]); setErrors(prev => ({ ...prev, startDate: undefined })); setIsDirty(true); }}
                                className="w-full py-3 border-2 border-dashed border-blue-300 rounded-2xl text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                Thêm ngày khởi hành
                            </button>
                        </div>
                    </div>

                    {/* ─── Section 5: Hình ảnh ─── */}
                    <div id="tour-section-cover" className="scroll-mt-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-teal-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-teal-600 text-[14px]">image</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Ảnh bìa</h3>
                            {recommendedBadge}
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 cursor-pointer hover:border-primary/40 hover:bg-surface-container-lowest/50 transition-all group"
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
                                <p className="text-xs text-on-surface-variant mt-1">JPG, JPEG hoặc PNG · Tối đa 5&nbsp;MB · Nên dùng ảnh ngang, rõ chủ thể tour</p>
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

                    {/* ─── Section 5b: Gallery ảnh ─── */}
                    <div id="tour-section-gallery" className="scroll-mt-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-indigo-600 text-[14px]">photo_library</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Gallery ảnh</h3>
                            <span className="text-[10px] font-bold text-on-surface-variant/60">Tối đa 10 ảnh</span>
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
                                <p className="text-xs text-on-surface-variant mt-0.5">JPG, PNG · Tối đa 5 MB / ảnh · Khuyến nghị 6-9 ảnh</p>
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

                    {/* ─── Section 6: Gói tour ─── */}
                    <div id="tour-section-packages" className="scroll-mt-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-emerald-600 text-[14px]">package_2</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Gói tour</h3>
                            <span className="text-[10px] font-bold text-on-surface-variant/60">Khuyến nghị nếu tour có hạng nâng cấp</span>
                        </div>
                        <div className="space-y-4">
                            {packages.map((pkg, idx) => (
                                <div key={idx} className="bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Gói #{idx + 1}</span>
                                        <button type="button" onClick={() => setPackages(p => p.filter((_, i) => i !== idx))}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Tên gói — dropdown + custom */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tên gói *</label>
                                            <div
                                                className="relative"
                                                onBlur={() => window.setTimeout(() => setOpenPackageNameIndex(null), 120)}
                                            >
                                                <input
                                                    type="text"
                                                    role="combobox"
                                                    aria-expanded={openPackageNameIndex === idx}
                                                    aria-controls={`package-name-options-${idx}`}
                                                    autoComplete="off"
                                                    placeholder="Gõ hoặc chọn tên gói..."
                                                    value={pkg.name}
                                                    onFocus={() => setOpenPackageNameIndex(idx)}
                                                    onChange={e => {
                                                        updatePackage(idx, {
                                                            name: e.target.value,
                                                            nameMode: PACKAGE_NAMES.includes(e.target.value) ? 'select' : 'custom',
                                                        });
                                                        setOpenPackageNameIndex(idx);
                                                    }}
                                                    onKeyDown={e => {
                                                        const filteredPackageNames = PACKAGE_NAMES.filter(name =>
                                                            !pkg.name.trim() || normalizeSearchValue(name).includes(normalizeSearchValue(pkg.name))
                                                        );
                                                        if (e.key === 'Escape') setOpenPackageNameIndex(null);
                                                        if (e.key === 'Enter' && filteredPackageNames.length > 0) {
                                                            e.preventDefault();
                                                            updatePackage(idx, { name: filteredPackageNames[0], nameMode: 'select' });
                                                            setOpenPackageNameIndex(null);
                                                        }
                                                    }}
                                                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 pr-16 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                />
                                                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                                                    {pkg.name && (
                                                        <button
                                                            type="button"
                                                            onMouseDown={e => e.preventDefault()}
                                                            onClick={() => {
                                                                updatePackage(idx, { name: '', nameMode: 'select' });
                                                                setOpenPackageNameIndex(idx);
                                                            }}
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container hover:text-error"
                                                            aria-label="Xóa tên gói"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                                        </button>
                                                    )}
                                                    <span className="material-symbols-outlined text-on-surface-variant/40 text-base pointer-events-none">expand_more</span>
                                                </div>
                                                {openPackageNameIndex === idx && (() => {
                                                    const filteredPackageNames = PACKAGE_NAMES.filter(name =>
                                                        !pkg.name.trim() || normalizeSearchValue(name).includes(normalizeSearchValue(pkg.name))
                                                    );
                                                    const exactMatch = PACKAGE_NAMES.some(name => normalizeSearchValue(name) === normalizeSearchValue(pkg.name));
                                                    return (
                                                        <div
                                                            id={`package-name-options-${idx}`}
                                                            role="listbox"
                                                            className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                                                        >
                                                            {filteredPackageNames.map(name => {
                                                                const active = pkg.name === name;
                                                                return (
                                                                    <button
                                                                        key={name}
                                                                        type="button"
                                                                        role="option"
                                                                        aria-selected={active}
                                                                        onMouseDown={e => e.preventDefault()}
                                                                        onClick={() => {
                                                                            updatePackage(idx, { name, nameMode: 'select' });
                                                                            setOpenPackageNameIndex(null);
                                                                        }}
                                                                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'text-on-surface hover:bg-surface-container'}`}
                                                                    >
                                                                        <span className="flex min-w-0 items-center gap-2">
                                                                            <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                                                                            <span className="truncate">{name}</span>
                                                                        </span>
                                                                        {active && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                            {pkg.name.trim() && !exactMatch && (
                                                                <button
                                                                    type="button"
                                                                    role="option"
                                                                    aria-selected={false}
                                                                    onMouseDown={e => e.preventDefault()}
                                                                    onClick={() => {
                                                                        updatePackage(idx, { name: pkg.name.trim(), nameMode: 'custom' });
                                                                        setOpenPackageNameIndex(null);
                                                                    }}
                                                                    className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-outline-variant/10 px-3 py-2.5 text-left text-sm font-semibold text-primary hover:bg-primary/10"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                                                    <span>Dùng &quot;{pkg.name.trim()}&quot;</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Phụ thu nâng cấp (VNĐ) *</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={formatCurrencyInput(pkg.price)}
                                                onChange={e => setPackages(p => p.map((x, i) => i === idx ? { ...x, price: stripCurrencyInput(e.target.value) } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                    </div>
                                    <div className={englishFieldClass}>
                                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Bản dịch tiếng Anh của gói</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Mô tả ngắn</label>
                                            <input type="text" placeholder="Phù hợp cho gia đình..." value={pkg.description}
                                                onChange={e => setPackages(p => p.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Nhãn gói</label>
                                            <div
                                                className="relative"
                                                onBlur={() => window.setTimeout(() => setOpenPackageBadgeIndex(null), 120)}
                                            >
                                                {(() => {
                                                    const selectedBadge = PACKAGE_BADGE_OPTIONS.find(option => option.value === pkg.badge) ?? PACKAGE_BADGE_OPTIONS[0];
                                                    return (
                                                        <>
                                                            <button
                                                                type="button"
                                                                aria-expanded={openPackageBadgeIndex === idx}
                                                                aria-controls={`package-badge-options-${idx}`}
                                                                onClick={() => setOpenPackageBadgeIndex(open => open === idx ? null : idx)}
                                                                className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary"
                                                            >
                                                                <span className="flex min-w-0 items-center gap-2">
                                                                    <span className={`material-symbols-outlined text-[17px] ${selectedBadge.tone}`}>{selectedBadge.icon}</span>
                                                                    <span className="truncate font-semibold text-on-surface">{selectedBadge.label}</span>
                                                                </span>
                                                                <span className={`material-symbols-outlined text-[18px] text-on-surface-variant/40 transition-transform ${openPackageBadgeIndex === idx ? 'rotate-180' : ''}`}>expand_more</span>
                                                            </button>
                                                            {openPackageBadgeIndex === idx && (
                                                                <div
                                                                    id={`package-badge-options-${idx}`}
                                                                    role="listbox"
                                                                    className="absolute z-30 mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                                                                >
                                                                    {PACKAGE_BADGE_OPTIONS.map(option => {
                                                                        const active = pkg.badge === option.value;
                                                                        return (
                                                                            <button
                                                                                key={option.value || 'none'}
                                                                                type="button"
                                                                                role="option"
                                                                                aria-selected={active}
                                                                                onMouseDown={e => e.preventDefault()}
                                                                                onClick={() => selectPackageBadge(idx, option.value)}
                                                                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'text-on-surface hover:bg-surface-container'}`}
                                                                            >
                                                                                <span className="flex min-w-0 items-center gap-2">
                                                                                    <span className={`material-symbols-outlined text-[17px] ${active ? 'text-on-primary' : option.tone}`}>{option.icon}</span>
                                                                                    <span className="truncate">{option.label}</span>
                                                                                </span>
                                                                                {active && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
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
                                                presets={includePresets}
                                                color="emerald"
                                                canSavePreset={canSaveSharedPackagePreset}
                                                onCreatePreset={label => createSharedPackagePreset('INCLUDE', label)}
                                                onChange={val => setPackages(p => p.map((x, i) => i === idx ? { ...x, includes: val } : x))}
                                            />
                                        </div>
                                        <div className={englishFieldClass}>
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
                                                presets={excludePresets}
                                                color="red"
                                                canSavePreset={canSaveSharedPackagePreset}
                                                onCreatePreset={label => createSharedPackagePreset('EXCLUDE', label)}
                                                onChange={val => setPackages(p => p.map((x, i) => i === idx ? { ...x, excludes: val } : x))}
                                            />
                                        </div>
                                        <div className={englishFieldClass}>
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

                    {/* --- Section 7: Diem noi bat --- */}
                    <div id="tour-section-highlights" className="scroll-mt-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-amber-600 text-[14px]">auto_awesome</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Điểm nổi bật</h3>
                            <span className="text-[10px] font-bold text-on-surface-variant/60">Khuyến nghị 3-6 ý bán hàng rõ ràng</span>
                        </div>
                        <div className="space-y-3">
                            {highlights.map((highlight, idx) => (
                                <div key={highlight.id ?? idx} className="bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Điểm #{idx + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setHighlights(prev => prev.filter((_, i) => i !== idx));
                                                setIsDirty(true);
                                            }}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
                                            aria-label={`Xóa điểm nổi bật ${idx + 1}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Biểu tượng</label>
                                            <div
                                                className="relative"
                                                onBlur={() => window.setTimeout(() => setOpenHighlightIconIndex(null), 120)}
                                            >
                                                {(() => {
                                                    const selectedIcon = HIGHLIGHT_ICONS.find(icon => icon.value === highlight.icon) ?? HIGHLIGHT_ICONS[0];
                                                    return (
                                                        <>
                                                            <button
                                                                type="button"
                                                                aria-expanded={openHighlightIconIndex === idx}
                                                                aria-controls={`highlight-icon-options-${idx}`}
                                                                onClick={() => setOpenHighlightIconIndex(open => open === idx ? null : idx)}
                                                                className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary"
                                                            >
                                                                <span className="flex min-w-0 items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[17px] text-amber-600">{selectedIcon.value}</span>
                                                                    <span className="truncate font-semibold text-on-surface">{selectedIcon.label}</span>
                                                                </span>
                                                                <span className={`material-symbols-outlined text-[18px] text-on-surface-variant/40 transition-transform ${openHighlightIconIndex === idx ? 'rotate-180' : ''}`}>expand_more</span>
                                                            </button>
                                                            {openHighlightIconIndex === idx && (
                                                                <div
                                                                    id={`highlight-icon-options-${idx}`}
                                                                    role="listbox"
                                                                    className="absolute z-30 mt-2 max-h-64 w-64 overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                                                                >
                                                                    {HIGHLIGHT_ICONS.map(icon => {
                                                                        const active = highlight.icon === icon.value;
                                                                        return (
                                                                            <button
                                                                                key={icon.value}
                                                                                type="button"
                                                                                role="option"
                                                                                aria-selected={active}
                                                                                onMouseDown={e => e.preventDefault()}
                                                                                onClick={() => selectHighlightIcon(idx, icon.value)}
                                                                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? 'bg-amber-500 text-white font-semibold shadow-sm' : 'text-on-surface hover:bg-surface-container'}`}
                                                                            >
                                                                                <span className="flex min-w-0 items-center gap-2">
                                                                                    <span className={`material-symbols-outlined text-[17px] ${active ? 'text-white' : 'text-amber-600'}`}>{icon.value}</span>
                                                                                    <span className="truncate">{icon.label}</span>
                                                                                </span>
                                                                                {active && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Nội dung nổi bật *</label>
                                            <input
                                                type="text"
                                                value={highlight.content}
                                                onChange={e => updateHighlight(idx, { content: e.target.value })}
                                                placeholder="Ví dụ: Du thuyền 5 sao ngắm hoàng hôn trên vịnh..."
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className={englishFieldClass}>
                                        <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Highlight (English)</label>
                                        <input
                                            type="text"
                                            value={highlight.contentEn}
                                            onChange={e => updateHighlight(idx, { contentEn: e.target.value })}
                                            placeholder="Example: 5-star sunset cruise on the bay..."
                                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        />
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    setHighlights(prev => [...prev, { ...EMPTY_HIGHLIGHT }]);
                                    setIsDirty(true);
                                }}
                                className="w-full py-3 border-2 border-dashed border-amber-300 rounded-2xl text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                Thêm điểm nổi bật
                            </button>
                        </div>
                    </div>

                    {/* --- Section 8: FAQ --- */}
                    <div id="tour-section-faqs" className="scroll-mt-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-sky-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-sky-600 text-[14px]">help_outline</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">FAQ</h3>
                            <span className="text-[10px] font-bold text-on-surface-variant/60">Giải đáp trước các câu hỏi hay gặp</span>
                        </div>
                        <div className="space-y-3">
                            {faqs.map((faq, idx) => (
                                <div key={faq.id ?? idx} className="bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">FAQ #{idx + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFaqs(prev => prev.filter((_, i) => i !== idx));
                                                setIsDirty(true);
                                            }}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
                                            aria-label={`Xóa FAQ ${idx + 1}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Câu hỏi mẫu</label>
                                        <div
                                            className="relative"
                                            onBlur={() => window.setTimeout(() => setOpenFaqTemplateIndex(null), 120)}
                                        >
                                            <button
                                                type="button"
                                                aria-expanded={openFaqTemplateIndex === idx}
                                                aria-controls={`faq-template-options-${idx}`}
                                                onClick={() => setOpenFaqTemplateIndex(open => open === idx ? null : idx)}
                                                className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary"
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <span className="material-symbols-outlined text-[17px] text-sky-600">format_list_bulleted_add</span>
                                                    <span className="truncate font-semibold text-on-surface-variant">Chọn mẫu để điền nhanh câu hỏi</span>
                                                </span>
                                                <span className={`material-symbols-outlined text-[18px] text-on-surface-variant/40 transition-transform ${openFaqTemplateIndex === idx ? 'rotate-180' : ''}`}>expand_more</span>
                                            </button>
                                            {openFaqTemplateIndex === idx && (
                                                <div
                                                    id={`faq-template-options-${idx}`}
                                                    role="listbox"
                                                    className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                                                >
                                                    {FAQ_TEMPLATES.map(template => (
                                                        <button
                                                            key={template.question}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={faq.question === template.question}
                                                            onMouseDown={e => e.preventDefault()}
                                                            onClick={() => applyFaqTemplate(idx, template)}
                                                            className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-container"
                                                        >
                                                            <span className="mt-0.5 rounded-lg bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-700">{template.category}</span>
                                                            <span className="min-w-0">
                                                                <span className="block text-sm font-semibold text-on-surface">{template.question}</span>
                                                                <span className="mt-0.5 block text-[11px] leading-relaxed text-on-surface-variant/65">{template.answerHint}</span>
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={bilingualGridClass}>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Câu hỏi *</label>
                                            <input
                                                type="text"
                                                value={faq.question}
                                                onChange={e => updateFaq(idx, { question: e.target.value })}
                                                placeholder="Tour có phù hợp cho trẻ em không?"
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            />
                                        </div>
                                        <div className={englishFieldClass}>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Question (English)</label>
                                            <input
                                                type="text"
                                                value={faq.questionEn}
                                                onChange={e => updateFaq(idx, { questionEn: e.target.value })}
                                                placeholder="Is this tour suitable for children?"
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className={bilingualGridClass}>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Câu trả lời *</label>
                                            <textarea
                                                rows={4}
                                                value={faq.answer}
                                                onChange={e => updateFaq(idx, { answer: e.target.value })}
                                                placeholder="Có. Lịch trình nhẹ, phù hợp cho gia đình có trẻ em..."
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                                            />
                                            <p className="mt-1.5 text-[11px] leading-relaxed text-on-surface-variant/65">Nên trả lời ngắn 1-3 câu, nêu rõ điều kiện áp dụng nếu có.</p>
                                        </div>
                                        <div className={englishFieldClass}>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Answer (English)</label>
                                            <textarea
                                                rows={4}
                                                value={faq.answerEn}
                                                onChange={e => updateFaq(idx, { answerEn: e.target.value })}
                                                placeholder="Yes. The itinerary is light and family-friendly..."
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    setFaqs(prev => [...prev, { ...EMPTY_FAQ }]);
                                    setIsDirty(true);
                                }}
                                className="w-full py-3 border-2 border-dashed border-sky-300 rounded-2xl text-sm font-semibold text-sky-700 hover:bg-sky-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                Thêm FAQ
                            </button>
                        </div>
                    </div>

                    {/* --- Section 9: Lich trinh --- */}
                    <div id="tour-section-itinerary" className="scroll-mt-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-indigo-600 text-[14px]">route</span>
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Lịch trình theo ngày</h3>
                            <span className="text-[10px] font-bold text-on-surface-variant/60">Khuyến nghị có ít nhất 1 ngày đủ tiêu đề và mô tả</span>
                        </div>
                        <div className="space-y-4">
                            {itinerary.map((day, idx) => (
                                <div key={day.id ?? `day-${idx}`} className="bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-on-surface uppercase tracking-wider">Ngày {idx + 1}</p>
                                                <p className="text-[11px] text-on-surface-variant/60">Nội dung hiển thị trên trang chi tiết tour</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setItinerary(prev => prev
                                                    .filter((_, i) => i !== idx)
                                                    .map((item, i) => ({ ...item, dayNumber: i + 1 })));
                                                setIsDirty(true);
                                            }}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
                                            aria-label={`Xóa ngày ${idx + 1}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>

                                    <div className={bilingualGridClass}>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tiêu đề ngày *</label>
                                            <input
                                                type="text"
                                                value={day.title}
                                                onChange={e => updateItineraryDay(idx, { title: e.target.value })}
                                                placeholder="Khám phá phố cổ và ẩm thực địa phương"
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            />
                                        </div>
                                        <div className={englishFieldClass}>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Day title (English)</label>
                                            <input
                                                type="text"
                                                value={day.titleEn}
                                                onChange={e => updateItineraryDay(idx, { titleEn: e.target.value })}
                                                placeholder="Explore the old town and local cuisine"
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className={bilingualGridClass}>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Mô tả ngày *</label>
                                            <textarea
                                                rows={4}
                                                value={day.description}
                                                onChange={e => updateItineraryDay(idx, { description: e.target.value })}
                                                placeholder="Buổi sáng khởi hành, tham quan các điểm chính, dùng bữa theo chương trình..."
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                                            />
                                        </div>
                                        <div className={englishFieldClass}>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Description (English)</label>
                                            <textarea
                                                rows={4}
                                                value={day.descriptionEn}
                                                onChange={e => updateItineraryDay(idx, { descriptionEn: e.target.value })}
                                                placeholder="Morning departure, key sightseeing stops, and scheduled meals..."
                                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest/70 p-3">
                                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Bữa ăn bao gồm</span>
                                            <span className="text-[10px] font-semibold text-on-surface-variant/60">Chọn các bữa có trong ngày</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                            {MEAL_OPTIONS.map(meal => {
                                                const selected = day[meal.key];
                                                return (
                                                    <button
                                                        key={meal.key}
                                                        type="button"
                                                        aria-pressed={selected}
                                                        onClick={() => updateItineraryDay(idx, { [meal.key]: !selected })}
                                                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected
                                                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                                            : 'border-outline-variant/15 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                                                        }`}
                                                    >
                                                        <span className="inline-flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-[16px]">{meal.icon}</span>
                                                            {meal.label}
                                                        </span>
                                                        <span className={`material-symbols-outlined text-[16px] ${selected ? 'text-indigo-600' : 'text-on-surface-variant/35'}`}>
                                                            {selected ? 'check_circle' : 'radio_button_unchecked'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Khách sạn / lưu trú</label>
                                            <PresetTextInput
                                                value={day.accommodation}
                                                presets={ACCOMMODATION_PRESETS}
                                                icon="hotel"
                                                placeholder="Resort 4 sao hoặc khách sạn trung tâm"
                                                onChange={value => updateItineraryDay(idx, { accommodation: value })}
                                            />
                                            <PresetTextInput
                                                value={day.accommodationEn}
                                                presets={ACCOMMODATION_EN_PRESETS}
                                                icon="hotel"
                                                placeholder="Accommodation in English"
                                                className={`mt-2 ${englishFieldClass}`}
                                                onChange={value => updateItineraryDay(idx, { accommodationEn: value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Phương tiện</label>
                                            <PresetTextInput
                                                value={day.transport}
                                                presets={TRANSPORT_PRESETS}
                                                icon="directions_bus"
                                                placeholder="Xe du lịch, tàu cao tốc, cáp treo..."
                                                onChange={value => updateItineraryDay(idx, { transport: value })}
                                            />
                                            <PresetTextInput
                                                value={day.transportEn}
                                                presets={TRANSPORT_EN_PRESETS}
                                                icon="directions_bus"
                                                placeholder="Transport in English"
                                                className={`mt-2 ${englishFieldClass}`}
                                                onChange={value => updateItineraryDay(idx, { transportEn: value })}
                                            />
                                        </div>
                                    </div>

                                    <div className={bilingualGridClass}>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Điểm tham quan / hoạt động</label>
                                            <TagChipField
                                                items={splitLines(day.activitiesText)}
                                                presets={ACTIVITY_PRESETS}
                                                color="indigo"
                                                onChange={items => updateItineraryDay(idx, { activitiesText: items.join('\n') })}
                                            />
                                            <p className={helperTextClass}>Nên chọn 3-6 hoạt động chính, tránh nhập quá dài như mô tả ngày.</p>
                                        </div>
                                        <div className={englishFieldClass}>
                                            <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Activities (English)</label>
                                            <TagChipField
                                                items={splitLines(day.activitiesEnText)}
                                                presets={ACTIVITY_EN_PRESETS}
                                                color="indigo"
                                                onChange={items => updateItineraryDay(idx, { activitiesEnText: items.join('\n') })}
                                            />
                                            <p className={helperTextClass}>Giữ tương ứng với danh sách tiếng Việt để bản dịch rõ ràng.</p>
                                        </div>
                                    </div>

                                    <div className={bilingualGridClass}>
                                        <div>
                                            <div className="mb-1 flex items-center justify-between gap-3">
                                                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Timeline trong ngày</label>
                                                <span className="text-[10px] font-semibold text-on-surface-variant/60">Giờ + hoạt động</span>
                                            </div>
                                            <div className="space-y-2">
                                                {(day.timelineItems?.length ? day.timelineItems : [createEmptyTimelineEntry()]).map((entry, entryIndex) => (
                                                    <div key={`timeline-${idx}-${entryIndex}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_minmax(0,1fr)_36px]">
                                                        <input
                                                            type="text"
                                                            value={entry.time}
                                                            onChange={e => updateItineraryTimelineEntry(idx, 'timelineItems', entryIndex, { time: e.target.value })}
                                                            placeholder="07:30"
                                                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={entry.activity}
                                                            onChange={e => updateItineraryTimelineEntry(idx, 'timelineItems', entryIndex, { activity: e.target.value })}
                                                            placeholder="Đón khách tại điểm hẹn"
                                                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItineraryTimelineEntry(idx, 'timelineItems', entryIndex)}
                                                            className="h-10 w-full rounded-xl text-error transition-colors hover:bg-error/10 sm:w-9"
                                                            aria-label={`Xóa mốc timeline ${entryIndex + 1}`}
                                                        >
                                                            <span className="material-symbols-outlined text-[17px]">delete</span>
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => addItineraryTimelineEntry(idx, 'timelineItems')}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/35 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                                    Thêm mốc thời gian
                                                </button>
                                            </div>
                                            <p className={helperTextClass}>Nên nhập theo thứ tự diễn ra trong ngày, ví dụ 07:30 - Đón khách.</p>
                                        </div>
                                        <div className={englishFieldClass}>
                                            <div className="mb-1 flex items-center justify-between gap-3">
                                                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Timeline tiếng Anh</label>
                                                <span className="text-[10px] font-semibold text-on-surface-variant/60">Time + activity</span>
                                            </div>
                                            <div className="space-y-2">
                                                {(day.timelineEnItems?.length ? day.timelineEnItems : [createEmptyTimelineEntry()]).map((entry, entryIndex) => (
                                                    <div key={`timeline-en-${idx}-${entryIndex}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_minmax(0,1fr)_36px]">
                                                        <input
                                                            type="text"
                                                            value={entry.time}
                                                            onChange={e => updateItineraryTimelineEntry(idx, 'timelineEnItems', entryIndex, { time: e.target.value })}
                                                            placeholder="07:30"
                                                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={entry.activity}
                                                            onChange={e => updateItineraryTimelineEntry(idx, 'timelineEnItems', entryIndex, { activity: e.target.value })}
                                                            placeholder="Pick up at meeting point"
                                                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItineraryTimelineEntry(idx, 'timelineEnItems', entryIndex)}
                                                            className="h-10 w-full rounded-xl text-error transition-colors hover:bg-error/10 sm:w-9"
                                                            aria-label={`Xóa mốc timeline tiếng Anh ${entryIndex + 1}`}
                                                        >
                                                            <span className="material-symbols-outlined text-[17px]">delete</span>
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => addItineraryTimelineEntry(idx, 'timelineEnItems')}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/35 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                                    Thêm mốc tiếng Anh
                                                </button>
                                            </div>
                                            <p className={helperTextClass}>Giữ cùng khung giờ với timeline tiếng Việt để khách dễ đối chiếu.</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    setItinerary(prev => [...prev, createEmptyItineraryDay(prev.length + 1)]);
                                    setIsDirty(true);
                                }}
                                className="w-full py-3 border-2 border-dashed border-indigo-300 rounded-2xl text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                Thêm ngày lịch trình
                            </button>
                        </div>
                    </div>

                </form>

                {/* ── Footer ── */}
                <div className="px-5 py-4 sm:px-7 sm:py-5 border-t border-outline-variant/10 bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                    <p className="text-xs text-on-surface-variant sm:max-w-md">
                        {`Lưu nháp có thể thiếu thông tin. “${finalActionText}” sẽ kiểm tra các mục bắt buộc trong checklist.`}
                    </p>
                    <div className="flex w-full sm:w-auto flex-wrap justify-end gap-3">
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
            </div>
        </div>
    );
}
