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
  createdAt: string;
  computedStatus: 'active' | 'expired' | 'depleted' | 'inactive';
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

export interface VoucherKpiItem {
  icon: string;
  label: string;
  value: string;
  color: string;
  active: boolean;
  onClick?: () => void;
}
