export type ProfileUser = {
    fullName?: string;
    phone?: string;
    email?: string;
    dob?: string;
    gender?: string;
    identityType?: string;
    identityNo?: string;
    avatarUrl?: string;
    authProvider?: string; // "local" | "google" | "both"
    googleId?: string | null;
    createdAt?: string;
};

export type RecentBooking = {
    id: number | string;
    status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CANCEL_REQUESTED' | string;
    paymentStatus?: string;
    totalPrice: number;
    createdAt: string;
    tour?: {
        name?: string;
        imageUrl?: string;
    };
};
