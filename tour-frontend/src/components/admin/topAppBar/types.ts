// ── Types ────────────────────────────────────────────────────────────────────
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';

export type RoleAction = {
    label: string;
    desc: string;
    icon: string;
    href: string;
    color: string;
    roles: AdminRole[];
};

export type CommandGroup = {
    title: string;
    actions: RoleAction[];
};

export type NotifType =
    | 'booking_pending'
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'booking_cancel_requested'
    | 'support_new'
    | 'support_in_progress'
    | 'review_good'
    | 'review_bad'
    | 'customer_new';

export interface Notif {
    id: string;
    type: NotifType;
    title: string;
    body: string;
    time: string;
    href: string;
    urgent?: boolean;
}

export type SearchTourResult = {
    id: number | string;
    name: string;
    price: number;
};

export type SearchDestinationResult = {
    id: number | string;
    name: string;
    region?: string;
};

export type TabKey = 'all' | 'booking' | 'support' | 'review' | 'customer';
