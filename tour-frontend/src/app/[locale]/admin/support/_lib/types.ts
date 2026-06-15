export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
export type TicketCategory = 'booking' | 'payment' | 'reschedule' | 'complaint' | 'general';
export type TicketView = 'ALL' | 'OPEN' | 'OVERDUE';
export type TicketSort = 'updated' | 'oldest' | 'overdue';
export type TicketAssignee = 'ALL' | 'ME' | 'NONE';

export interface Reply {
    id: number;
    senderType: string;
    senderName: string;
    content: string;
    isInternal?: boolean;
    createdAt: string;
}

export interface AuditEvent {
    id: number;
    actorName: string;
    eventType: 'ASSIGNED' | 'STATUS_CHANGED';
    meta?: Record<string, unknown>;
    createdAt: string;
}

export interface LinkedBooking {
    id: number;
    bookingCode: string;
    tourId: number;
    tourName: string;
    tourStartDate: string;
    tourDuration: string;
    departureId: number | null;
    departureDate: string | null;
    status: string;
    paymentStatus: string;
    numberOfPeople: number;
    totalPrice: number;
    createdAt: string;
}

export interface SupportRequestDetail {
    label: string;
    value: string;
}

export interface Ticket {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    bookingRef?: string;
    category: TicketCategory;
    subject: string;
    message: string;
    status: TicketStatus;
    assignedStaffId?: number | null;
    assignedStaffName?: string | null;
    linkedBooking?: LinkedBooking | null;
    bookingMatchStatus?: 'NO_REFERENCE' | 'MATCHED' | 'NOT_FOUND';
    createdAt: string;
    replies: Reply[];
    auditLogs?: AuditEvent[];
}

export interface Kpi {
    total: number;
    new: number;
    inProgress: number;
    resolved: number;
    open: number;
    overdue: number;
    avgFirstResponseMinutes: number | null;
}

export type FetchTicketsOptions = {
    silent?: boolean;
};

export type PaginationMeta = {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export type TicketListResponse = {
    data?: {
        tickets?: Ticket[];
        meta?: PaginationMeta;
    };
    tickets?: Ticket[];
    meta?: PaginationMeta;
};

export type TicketResponse = Ticket | { data: Ticket };

export type ReplyResponse = Reply | { data: Reply };

export type StatsResponse = Partial<Kpi> | { data?: Partial<Kpi> };

export type ApiErrorPayload = {
    message?: string | string[];
};
