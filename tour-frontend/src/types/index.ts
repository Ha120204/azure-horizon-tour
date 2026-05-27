/**
 * Shared TypeScript types/interfaces cho toàn bộ frontend.
 * Thay thế dần các `any` type đang dùng khắp nơi.
 */

// ── Tour ──────────────────────────────────────────────────────────
export interface TourHighlight {
    id: number;
    content: string;
    contentEn?: string | null;
    icon: string;
}

export interface TourTimelineEntry {
    time: string;
    activity: string;
}

export interface TourItineraryDay {
    id: number;
    dayNumber: number;
    title: string;
    titleEn?: string | null;
    description: string;
    descriptionEn?: string | null;
    mealsBreakfast?: boolean;
    mealsLunch?: boolean;
    mealsDinner?: boolean;
    accommodation?: string | null;
    accommodationEn?: string | null;
    transport?: string | null;
    transportEn?: string | null;
    activities?: string[];
    activitiesEn?: string[];
    imageUrl?: string | null;
    timeline?: TourTimelineEntry[];
    timelineEn?: TourTimelineEntry[];
}

export interface TourFAQ {
    id: number;
    question: string;
    questionEn?: string | null;
    answer: string;
    answerEn?: string | null;
}

export interface Tour {
    id: number;
    name: string;
    nameEn?: string | null;
    description: string;
    descriptionEn?: string | null;
    price: number;
    duration: string;
    durationEn?: string | null;
    imageUrl: string;
    tourCode: string;
    startDate: string;
    endDate: string;
    availableSeats: number;
    destination?: Destination;
    packages?: TourPackage[];
    departures?: TourDeparture[];
    highlights?: TourHighlight[];
    itinerary?: TourItineraryDay[];
    faqs?: TourFAQ[];
    departurePoint?: string;
    departurePointEn?: string | null;
}

export interface Destination {
    id: number;
    name: string;
    nameEn?: string | null;
    region?: string;
    regionEn?: string | null;
    imageUrl?: string;
    travelScope?: 'DOMESTIC' | 'INTERNATIONAL';
    countryCode?: string | null;
}

export interface TourPackage {
    id: number;
    name: string;
    nameEn?: string | null;
    description?: string;
    descriptionEn?: string | null;
    price: number;
    badge?: string;
    includes: string[];
    includesEn?: string[];
    excludes: string[];
    excludesEn?: string[];
}

export interface TourDeparture {
    id: number;
    departureDate: string;
    price: number;
    availableSeats: number;
    note?: string;
    noteEn?: string | null;
}

// ── User ──────────────────────────────────────────────────────────
export interface User {
    id: number;
    email: string;
    fullName: string;
    phone?: string;
    dob?: string;
    gender?: string;
    avatarUrl?: string;
    role: 'customer' | 'admin' | 'staff';
}

// ── Booking ───────────────────────────────────────────────────────
export interface Booking {
    id: number;
    tourId: number;
    userId: number;
    totalPrice: number;
    numberOfPeople: number;
    paymentStatus: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
    createdAt: string;
    tour?: Tour;
    user?: User;
}

// ── Voucher ───────────────────────────────────────────────────────
export interface Voucher {
    id: number;
    code: string;
    label: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    minOrderValue: number;
    maxUses: number;
    usedCount: number;
    expiresAt: string;
    isActive: boolean;
}

export interface UserVoucher {
    id: number;
    voucherId: number;
    userId: number;
    status: 'available' | 'used' | 'expired';
    voucher: Voucher;
}

// ── Review ────────────────────────────────────────────────────────
export interface Review {
    id: number;
    tourId: number;
    userId: number;
    rating: number;
    content: string;
    adminReply?: string;
    imageUrls?: string[];
    createdAt: string;
    user?: Pick<User, 'fullName' | 'avatarUrl'>;
}

export interface ReviewStats {
    averageRating: number;
    totalReviews: number;
}

// ── API Response ──────────────────────────────────────────────────
export interface ApiResponse<T> {
    statusCode: number;
    message: string;
    data: T;
}

export interface PaginatedResponse<T> {
    statusCode: number;
    message: string;
    data: T[];
    meta: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
}
