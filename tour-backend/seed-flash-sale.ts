import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = 'postgresql://postgres:12022004@localhost:5432/tour_db?schema=public';
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const end1d = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const end3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const end5d = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const updates: { tourId: number; category: string; ends: Date; pricePct: number; extraSeats: number }[] = [
    { tourId: 2,  category: 'EARLY_BIRD',  ends: end5d, pricePct: 0.78, extraSeats: 6  },
    { tourId: 4,  category: 'LAST_MINUTE', ends: end1d, pricePct: 0.82, extraSeats: 8  },
    { tourId: 7,  category: 'FLASH_SALE',  ends: end1d, pricePct: 0.68, extraSeats: 10 },
    { tourId: 9,  category: 'EARLY_BIRD',  ends: end5d, pricePct: 0.80, extraSeats: 7  },
    { tourId: 12, category: 'LAST_MINUTE', ends: end3d, pricePct: 0.85, extraSeats: 5  },
    { tourId: 17, category: 'FLASH_SALE',  ends: end3d, pricePct: 0.72, extraSeats: 12 },
  ];

  // Dep 189 tour 1 — đã có sẵn 1 ghế
  await prisma.tourDeparture.update({
    where: { id: 189 },
    data: { category: 'FLASH_SALE', flashSaleEndsAt: end3d, maxSeats: 5, price: 3800000 },
  });
  console.log('✅ dep 189 → FLASH_SALE | ends:', end3d.toISOString());

  for (const u of updates) {
    const dep = await prisma.tourDeparture.findFirst({
      where: { tourId: u.tourId, isActive: true },
      orderBy: { departureDate: 'asc' },
    });
    const tour = await prisma.tour.findUnique({ where: { id: u.tourId }, select: { price: true } });
    if (!dep || !tour) { console.log('⚠ skip tourId', u.tourId); continue; }

    await prisma.tourDeparture.update({
      where: { id: dep.id },
      data: {
        category: u.category,
        flashSaleEndsAt: u.ends,
        maxSeats: dep.availableSeats + u.extraSeats,
        price: Math.round(tour.price * u.pricePct),
      },
    });
    console.log(`✅ dep ${dep.id} (tour ${u.tourId}) → ${u.category} | price: ${Math.round(tour.price * u.pricePct).toLocaleString()}đ`);
  }

  const results = await prisma.tourDeparture.findMany({
    where: { category: { not: null } },
    select: { id: true, tourId: true, category: true, flashSaleEndsAt: true, maxSeats: true, availableSeats: true, price: true },
    orderBy: { tourId: 'asc' },
  });
  console.log('\n📊 Flash Sale Departures:');
  results.forEach(r => console.log(`  [${r.category}] dep${r.id} tour${r.tourId} | seats: ${r.availableSeats}/${r.maxSeats} | price: ${r.price?.toLocaleString()}đ | ends: ${r.flashSaleEndsAt?.toISOString()}`));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
