import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:12022004@localhost:5432/tour_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function seedVouchers() {
  const vouchers = [
    {
      code: 'AZURE2026',
      label: 'Premium Escape',
      description: 'Applicable for all villa bookings over 5 nights in Southeast Asia.',
      discountType: 'FIXED_AMOUNT' as const,
      discountValue: 500,
      minOrderValue: 1000,
      maxUses: 100,
      expiresAt: new Date('2026-12-31T23:59:59Z'),
    },
    {
      code: 'HORIZON15',
      label: 'Global Explorer',
      description: 'Exclusive discount on all-inclusive tours in the Mediterranean region.',
      discountType: 'PERCENTAGE' as const,
      discountValue: 15,
      minOrderValue: 500,
      maxUses: 200,
      expiresAt: new Date('2026-12-31T23:59:59Z'),
    },
    {
      code: 'CONCIERGE25',
      label: 'Flash Privilege',
      description: 'Redeemable for concierge services and airport luxury transfers.',
      discountType: 'FIXED_AMOUNT' as const,
      discountValue: 250,
      minOrderValue: 500,
      maxUses: 50,
      expiresAt: new Date('2026-09-30T23:59:59Z'),
    },
  ];

  for (const v of vouchers) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: v,
      create: v,
    });
    console.log(`Voucher ${v.code} - ${v.label} (${v.discountType}: ${v.discountValue})`);
  }

  console.log('\nSeed vouchers hoan tat!');
}

seedVouchers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
