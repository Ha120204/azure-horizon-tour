export interface CreateVoucherDto {
  code: string;
  label: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderValue?: number;
  maxUses?: number | null; // null = unlimited
  usageLimitPerUser?: number | null;
  startsAt?: string | null; // null = now
  expiresAt?: string | null; // null = never expires
  isActive?: boolean;
  isStackable?: boolean;
  eligibleTourIds?: number[];
  eligibleDestinationIds?: number[];
  eligibleCustomerSegments?: string[];
}
