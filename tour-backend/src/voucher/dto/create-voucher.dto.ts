export interface CreateVoucherDto {
  code: string;
  label: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderValue?: number;
  maxUses?: number | null; // null = unlimited
  expiresAt?: string | null; // null = never expires
  isActive?: boolean;
}
