export interface Voucher {
  id: number;
  code: string;
  label: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderValue: number;
  maxUses: number;
  usageLimitPerUser?: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  isStackable: boolean;
  eligibleTourIds: number[];
  eligibleDestinationIds: number[];
  eligibleCustomerSegments: string[];
  createdAt: string;
  computedStatus: 'active' | 'expired' | 'depleted' | 'inactive' | 'scheduled';
}

export interface Stats {
  totalActive: number;
  totalExpiredThisMonth: number;
  expiringSoon: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
}

export interface Meta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export type ModalMode = 'create' | 'edit' | null;

export type VoucherStatusFilter = Voucher['computedStatus'] | 'expiringSoon' | 'expiredThisMonth' | 'redeemed';
export type VoucherSortBy = 'createdAt' | 'startsAt' | 'expiresAt' | 'usedCount' | 'discountValue' | 'minOrderValue';
export type VoucherSortOrder = 'asc' | 'desc';

export interface VoucherKpiItem {
  icon: string;
  label: string;
  value: string;
  color: string;
  active: boolean;
  hint?: string;
  onClick?: () => void;
}
