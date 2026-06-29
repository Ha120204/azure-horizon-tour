export interface Voucher {
  id: number;
  code: string;
  label: string;
  labelEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderValue: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
}

export interface UserVoucher {
  id: number;
  voucherId: number;
  userId: number;
  status: 'available' | 'used' | 'expired';
  voucher: Voucher;
}
