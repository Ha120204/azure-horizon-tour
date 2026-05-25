export interface AdminVoucherQuery {
  search?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  status?:
    | 'active'
    | 'expired'
    | 'depleted'
    | 'inactive'
    | 'expiringSoon'
    | 'expiredThisMonth'
    | 'redeemed';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'expiresAt' | 'usedCount';
  sortOrder?: 'asc' | 'desc';
}

export interface VoucherValidationContext {
  tourId?: number | null;
  departureId?: number | null;
}
