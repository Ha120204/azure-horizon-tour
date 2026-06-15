// ── Data types ────────────────────────────────────────────────────────────────
export interface QuickStats {
    pending: number;
    confirmed: number;
    cancelRequested: number;
    total: number;
    publishedTours: number;
    unpaidCount?: number;
    pendingOverdue?: number;
    cancelRequestedOverdue?: number;
    assistedDraftPending?: number;
    tourDraft?: number;
    tourPending?: number;
    articleDraft?: number;
    articlePending?: number;
    supportOpen?: number;
    supportAssignedToMeOpen?: number;
    supportUnassignedOpen?: number;
    supportOverdue?: number;
}

export interface RecentTour {
    id: number;
    name: string;
    status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
    createdAt: string;
    destination?: { name: string };
    imageUrl?: string;
}

export interface RecentTicket {
    id: number;
    subject: string;
    customerName: string;
    status: string;
    category: string;
    assignedStaffId?: number | null;
    createdAt: string;
}

export interface BookingResult {
    id: number;
    bookingCode: string;
    status: string;
    paymentStatus: string;
    totalPrice: number;
    numberOfPeople: number;
    createdAt: string;
    user?: { fullName: string; email: string };
    tour?: { name: string };
}

export type Tone = 'amber' | 'orange' | 'blue' | 'teal' | 'violet' | 'slate' | 'emerald' | 'red';
