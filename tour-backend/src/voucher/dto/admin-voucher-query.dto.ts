export interface AdminVoucherQuery {
  search?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  status?:
    | 'active'
    | 'expired'
    | 'depleted'
    | 'inactive'
    | 'scheduled'
    | 'expiringSoon'
    | 'expiredThisMonth'
    | 'redeemed';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'startsAt' | 'expiresAt' | 'usedCount' | 'discountValue' | 'minOrderValue';
  sortOrder?: 'asc' | 'desc';
}

export interface VoucherValidationContext {
  userId?: number | null;
  tourId?: number | null;
  departureId?: number | null;
}
