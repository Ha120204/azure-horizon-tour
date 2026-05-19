import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedAdminUsers } from './seeds/admin-users.seed';
import { seedArticles } from './seeds/articles.seed';
import { seedDomesticTours } from './seeds/domestic-tours.seed';
import { seedInternationalTours } from './seeds/international-tours.seed';
import { seedPromotionDepartures } from './seeds/promotion-departures.seed';
import { seedVouchers } from './seeds/vouchers.seed';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://postgres:12022004@localhost:5432/tour_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as never);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding admin users...');
  await seedAdminUsers(prisma);
  console.log('Admin user seed completed.');

  console.log('Seeding articles...');
  await seedArticles(prisma);
  console.log('Article seed completed.');

  console.log('Seeding vouchers...');
  await seedVouchers(prisma);
  console.log('Voucher seed completed.');

  console.log('Seeding domestic tours...');
  await seedDomesticTours(prisma);
  console.log('Domestic tour seed completed.');

  console.log('Seeding international tours...');
  await seedInternationalTours(prisma);
  console.log('International tour seed completed.');

  console.log('Seeding promotion departures...');
  await seedPromotionDepartures(prisma);
  console.log('Promotion departure seed completed.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
