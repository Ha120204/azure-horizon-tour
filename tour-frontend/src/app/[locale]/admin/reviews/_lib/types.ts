export interface ReviewUser {
    id: number;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
}

export interface ReviewTour {
    id: number;
    name: string;
    tourCode: string;
}

export interface Review {
    id: number;
    rating: number;
    content: string;
    imageUrls: string[];
    isHidden: boolean;
    adminReply?: string | null;
    createdAt: string;
    updatedAt: string;
    user: ReviewUser;
    tour: ReviewTour;
}

export interface AdminStats {
    total: number;
    hidden: number;
    replied: number;
    unreplied: number;
    averageRating: number;
    fiveStarRate: number;
    breakdown: Record<number, number>;
}

export interface Meta {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
}

export interface ReviewKpiItem {
    icon: string;
    label: string;
    value: string | number;
    sub: string;
    gradient: string;
    iconBg: string;
    iconColor: string;
    onClick?: () => void;
    active?: boolean;
}
