import { PrismaClient } from '@prisma/client';

type PromotionCategory = 'FLASH_SALE' | 'EARLY_BIRD' | 'LAST_MINUTE';

type PromotionSeed = {
  tourCode: string;
  category: PromotionCategory;
  discountPercent: number;
  departureOffsetDays: number;
  availableSeats: number;
  maxSeats: number;
  deadlineOffsetDays?: number;
  note: string;
};

const promotionSeeds: PromotionSeed[] = [
  {
    tourCode: 'VN-HLG-002',
    category: 'FLASH_SALE',
    discountPercent: 18,
    departureOffsetDays: 24,
    availableSeats: 9,
    maxSeats: 36,
    deadlineOffsetDays: 3,
    note: 'Flash sale du thuyen Ha Long - so luong cabin gioi han',
  },
  {
    tourCode: 'VN-NTR-010',
    category: 'FLASH_SALE',
    discountPercent: 15,
    departureOffsetDays: 21,
    availableSeats: 12,
    maxSeats: 36,
    deadlineOffsetDays: 4,
    note: 'Flash sale tour bien dao Nha Trang',
  },
  {
    tourCode: 'VN-PQC-012',
    category: 'FLASH_SALE',
    discountPercent: 16,
    departureOffsetDays: 28,
    availableSeats: 10,
    maxSeats: 34,
    deadlineOffsetDays: 5,
    note: 'Flash sale Phu Quoc mua nghi duong',
  },
  {
    tourCode: 'INT-HKMO-005',
    category: 'FLASH_SALE',
    discountPercent: 12,
    departureOffsetDays: 35,
    availableSeats: 8,
    maxSeats: 30,
    deadlineOffsetDays: 5,
    note: 'Flash sale Hong Kong - Macau trong thang',
  },
  {
    tourCode: 'INT-UAE-009',
    category: 'FLASH_SALE',
    discountPercent: 10,
    departureOffsetDays: 45,
    availableSeats: 7,
    maxSeats: 28,
    deadlineOffsetDays: 6,
    note: 'Flash sale Dubai - Abu Dhabi phan khuc cao cap',
  },
  {
    tourCode: 'VN-DLI-011',
    category: 'EARLY_BIRD',
    discountPercent: 8,
    departureOffsetDays: 95,
    availableSeats: 34,
    maxSeats: 36,
    note: 'Dat som Da Lat mua cao diem',
  },
  {
    tourCode: 'VN-MOC-018',
    category: 'EARLY_BIRD',
    discountPercent: 10,
    departureOffsetDays: 85,
    availableSeats: 32,
    maxSeats: 36,
    note: 'Dat som Moc Chau mua hoa va doi che',
  },
  {
    tourCode: 'VN-CBG-020',
    category: 'EARLY_BIRD',
    discountPercent: 9,
    departureOffsetDays: 90,
    availableSeats: 30,
    maxSeats: 34,
    note: 'Dat som Cao Bang - Ban Gioc',
  },
  {
    tourCode: 'INT-JPN-007',
    category: 'EARLY_BIRD',
    discountPercent: 7,
    departureOffsetDays: 115,
    availableSeats: 28,
    maxSeats: 32,
    note: 'Dat som Nhat Ban Tokyo - Fuji de co thoi gian xu ly visa',
  },
  {
    tourCode: 'INT-EUR-010',
    category: 'EARLY_BIRD',
    discountPercent: 6,
    departureOffsetDays: 135,
    availableSeats: 24,
    maxSeats: 28,
    note: 'Dat som Chau Au Schengen de toi uu ve may bay va visa',
  },
  {
    tourCode: 'VN-MNE-013',
    category: 'LAST_MINUTE',
    discountPercent: 18,
    departureOffsetDays: 6,
    availableSeats: 3,
    maxSeats: 36,
    note: 'Gio chot Mui Ne cuoi tuan - chi con vai cho',
  },
  {
    tourCode: 'VN-VCA-016',
    category: 'LAST_MINUTE',
    discountPercent: 15,
    departureOffsetDays: 5,
    availableSeats: 4,
    maxSeats: 34,
    note: 'Gio chot Can Tho cho noi Cai Rang',
  },
  {
    tourCode: 'VN-MAI-019',
    category: 'LAST_MINUTE',
    discountPercent: 16,
    departureOffsetDays: 7,
    availableSeats: 2,
    maxSeats: 30,
    note: 'Gio chot Mai Chau gan Ha Noi',
  },
  {
    tourCode: 'INT-THA-001',
    category: 'LAST_MINUTE',
    discountPercent: 14,
    departureOffsetDays: 9,
    availableSeats: 5,
    maxSeats: 32,
    note: 'Gio chot Thai Lan mien visa, phu hop khoi hanh gan',
  },
  {
    tourCode: 'INT-SGMY-002',
    category: 'LAST_MINUTE',
    discountPercent: 12,
    departureOffsetDays: 10,
    availableSeats: 6,
    maxSeats: 32,
    note: 'Gio chot Singapore - Malaysia mien visa ngan ngay',
  },
];

function addDays(days: number): Date {
  const date = new Date();
  date.setHours(8, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function salePrice(basePrice: number, discountPercent: number): number {
  return Math.round(basePrice * (1 - discountPercent / 100));
}

function regularDepartures(
  basePrice: number,
  maxSeats: number,
  startOffset: number,
) {
  return [35, 60, 90].map((gap, index) => ({
    departureDate: addDays(startOffset + gap),
    price: basePrice,
    availableSeats: Math.max(12, maxSeats - index * 4),
    maxSeats,
    note: 'Lich khoi hanh dinh ky',
    category: null,
    flashSaleEndsAt: null,
    isActive: true,
    sortOrder: index + 1,
  }));
}

export async function seedPromotionDepartures(prisma: PrismaClient) {
  const affectedTourCodes = promotionSeeds.map((item) => item.tourCode);

  const tours = await prisma.tour.findMany({
    where: { tourCode: { in: affectedTourCodes }, deletedAt: null },
    select: { id: true, tourCode: true, price: true },
  });
  const tourByCode = new Map(tours.map((tour) => [tour.tourCode, tour]));

  const missingCodes = affectedTourCodes.filter(
    (code) => !tourByCode.has(code),
  );
  if (missingCodes.length > 0) {
    throw new Error(
      `Missing tours for promotion seed: ${missingCodes.join(', ')}`,
    );
  }

  for (const promo of promotionSeeds) {
    const tour = tourByCode.get(promo.tourCode);
    if (!tour) continue;

    await prisma.tourDeparture.deleteMany({ where: { tourId: tour.id } });

    const departureDate = addDays(promo.departureOffsetDays);
    const flashSaleEndsAt =
      promo.category === 'FLASH_SALE'
        ? addDays(promo.deadlineOffsetDays ?? 5)
        : null;

    await prisma.tourDeparture.createMany({
      data: [
        {
          tourId: tour.id,
          departureDate,
          price: salePrice(tour.price, promo.discountPercent),
          availableSeats: promo.availableSeats,
          maxSeats: promo.maxSeats,
          note: promo.note,
          category: promo.category,
          flashSaleEndsAt,
          isActive: true,
          sortOrder: 0,
        },
        ...regularDepartures(
          tour.price,
          promo.maxSeats,
          promo.departureOffsetDays,
        ).map((departure) => ({
          tourId: tour.id,
          ...departure,
        })),
      ],
    });
  }

  const summary = await prisma.tourDeparture.groupBy({
    by: ['category'],
    where: {
      tour: { tourCode: { in: affectedTourCodes } },
      category: { in: ['FLASH_SALE', 'EARLY_BIRD', 'LAST_MINUTE'] },
    },
    _count: { category: true },
    orderBy: { category: 'asc' },
  });

  console.table(
    summary.map((row) => ({
      category: row.category,
      count: row._count.category,
    })),
  );
}
