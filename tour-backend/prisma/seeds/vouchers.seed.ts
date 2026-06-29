import { DiscountType, PrismaClient } from '@prisma/client';

type VoucherSeed = {
  code: string;
  label: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderValue: number;
  maxUses: number;
  usageLimitPerUser?: number | null;
  startsAt?: Date;
  expiresAt: Date;
  isActive?: boolean;
  isStackable?: boolean;
  eligibleTourIds?: number[];
  eligibleDestinationIds?: number[];
  eligibleCustomerSegments?: string[];
};

const DEFAULT_PUBLIC_VOUCHER_STARTS_AT = new Date('2026-01-01T00:00:00.000Z');

const vouchers: VoucherSeed[] = [
  // Tour thường: ưu đãi nhẹ, số lượt dùng rộng, phù hợp hiển thị public thường xuyên.
  {
    code: 'AZUREWELCOME',
    label: 'Chào mừng Azure Horizon',
    description: 'Giảm 5% cho khách hàng mới khi đặt tour bất kỳ. Phù hợp dùng thử luồng lưu voucher, áp mã và thanh toán.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 5,
    minOrderValue: 0,
    maxUses: 1000,
    expiresAt: new Date('2027-12-31T23:59:59.000Z'),
  },
  {
    code: 'WEEKDAY5',
    label: 'Ưu đãi ngày thường',
    description: 'Giảm 5% cho các đơn đặt tour khởi hành ngày thường, khuyến khích khách chọn lịch ít cao điểm.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 5,
    minOrderValue: 1_000_000,
    maxUses: 800,
    expiresAt: new Date('2027-12-31T23:59:59.000Z'),
  },
  {
    code: 'FAMILY300K',
    label: 'Gia đình vi vu',
    description: 'Giảm 300.000đ cho booking gia đình từ hai khách trở lên, áp dụng cho hầu hết tour nội địa.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 300_000,
    minOrderValue: 3_000_000,
    maxUses: 600,
    expiresAt: new Date('2027-12-31T23:59:59.000Z'),
  },
  {
    code: 'CITYTOUR150K',
    label: 'City tour tiết kiệm',
    description: 'Giảm 150.000đ cho các tour tham quan thành phố, phù hợp nhóm khách muốn trải nghiệm ngắn ngày.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 150_000,
    minOrderValue: 1_500_000,
    maxUses: 700,
    expiresAt: new Date('2027-11-30T23:59:59.000Z'),
  },
  {
    code: 'BEACH7',
    label: 'Biển xanh mùa đẹp',
    description: 'Giảm 7% cho tour biển, áp dụng tốt cho các hành trình Đà Nẵng, Nha Trang, Quy Nhơn hoặc Phú Quốc.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 7,
    minOrderValue: 2_500_000,
    maxUses: 500,
    expiresAt: new Date('2027-10-31T23:59:59.000Z'),
  },
  {
    code: 'HERITAGE200K',
    label: 'Dấu ấn di sản',
    description: 'Giảm 200.000đ cho tour văn hóa, phố cổ, di tích và làng nghề truyền thống.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 200_000,
    minOrderValue: 2_000_000,
    maxUses: 500,
    expiresAt: new Date('2027-10-31T23:59:59.000Z'),
  },
  {
    code: 'COUPLE6',
    label: 'Cặp đôi khám phá',
    description: 'Giảm 6% cho booking hai khách, phù hợp các tour nghỉ dưỡng hoặc city break cuối tuần.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 6,
    minOrderValue: 2_000_000,
    maxUses: 650,
    expiresAt: new Date('2027-09-30T23:59:59.000Z'),
  },
  {
    code: 'LOCAL100K',
    label: 'Khởi hành gần',
    description: 'Giảm 100.000đ cho các tour ngắn ngày hoặc tour địa phương có giá trị đơn thấp.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 100_000,
    minOrderValue: 500_000,
    maxUses: 900,
    expiresAt: new Date('2027-09-30T23:59:59.000Z'),
  },
  {
    code: 'GROUP8',
    label: 'Nhóm bạn lên đường',
    description: 'Giảm 8% cho nhóm khách có tổng giá trị booking từ 5.000.000đ, hỗ trợ bán theo nhóm.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 8,
    minOrderValue: 5_000_000,
    maxUses: 400,
    expiresAt: new Date('2027-08-31T23:59:59.000Z'),
  },
  {
    code: 'RETURN250K',
    label: 'Khách quay lại',
    description: 'Giảm 250.000đ cho khách hàng thân thiết khi đặt chuyến tiếp theo trên Azure Horizon.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 250_000,
    minOrderValue: 2_500_000,
    maxUses: 500,
    expiresAt: new Date('2027-08-31T23:59:59.000Z'),
  },

  // Tour giới hạn: số lượt dùng thấp, hạn gần hơn, tạo cảm giác khan hiếm.
  {
    code: 'LIMITED10',
    label: 'Giới hạn 10 suất',
    description: 'Giảm 10% cho 10 lượt sử dụng đầu tiên. Dùng để demo trạng thái voucher giới hạn và khả năng hết lượt.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minOrderValue: 2_000_000,
    maxUses: 10,
    expiresAt: new Date('2026-08-31T23:59:59.000Z'),
  },
  {
    code: 'LIMITED500K',
    label: '500K số lượng giới hạn',
    description: 'Giảm 500.000đ cho một số lượng booking giới hạn, phù hợp chiến dịch kích cầu ngắn hạn.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 500_000,
    minOrderValue: 4_000_000,
    maxUses: 25,
    expiresAt: new Date('2026-08-31T23:59:59.000Z'),
  },
  {
    code: 'EARLYBIRD12',
    label: 'Early Bird giới hạn',
    description: 'Giảm 12% cho khách đặt sớm, số lượt dùng giới hạn để kiểm soát ngân sách khuyến mãi.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 12,
    minOrderValue: 3_000_000,
    maxUses: 40,
    expiresAt: new Date('2026-09-15T23:59:59.000Z'),
  },
  {
    code: 'WEEKEND300K',
    label: 'Cuối tuần giới hạn',
    description: 'Giảm 300.000đ cho tour cuối tuần, giới hạn 35 lượt dùng trong chiến dịch ngắn.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 300_000,
    minOrderValue: 3_500_000,
    maxUses: 35,
    expiresAt: new Date('2026-09-15T23:59:59.000Z'),
  },
  {
    code: 'SEATSALE15',
    label: 'Seat sale 15%',
    description: 'Giảm 15% cho các tour cần đẩy nhanh số ghế còn lại, áp dụng giới hạn để tránh vượt ngân sách.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 15,
    minOrderValue: 4_000_000,
    maxUses: 30,
    expiresAt: new Date('2026-09-30T23:59:59.000Z'),
  },
  {
    code: 'LIMITEDHA500',
    label: 'Hà Nội giới hạn 500K',
    description: 'Giảm 500.000đ cho tour Hà Nội hoặc miền Bắc, giới hạn lượt sử dụng trong giai đoạn chạy chiến dịch.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 500_000,
    minOrderValue: 5_000_000,
    maxUses: 20,
    expiresAt: new Date('2026-09-30T23:59:59.000Z'),
  },
  {
    code: 'LIMITEDSEA18',
    label: 'Biển hè giới hạn',
    description: 'Giảm 18% cho nhóm tour biển chọn lọc, giới hạn 18 lượt dùng đầu tiên.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 18,
    minOrderValue: 5_000_000,
    maxUses: 18,
    expiresAt: new Date('2026-10-15T23:59:59.000Z'),
  },
  {
    code: 'FLASH400K',
    label: 'Flash 400K',
    description: 'Giảm nhanh 400.000đ cho các booking đạt giá trị tối thiểu, phù hợp hiển thị trong chiến dịch flash sale.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 400_000,
    minOrderValue: 3_000_000,
    maxUses: 45,
    expiresAt: new Date('2026-10-15T23:59:59.000Z'),
  },
  {
    code: 'LIMITEDGROUP20',
    label: 'Nhóm giới hạn 20%',
    description: 'Giảm 20% cho nhóm khách đặt tour giá trị cao, số lượt dùng thấp để demo chiến dịch cao cấp.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 20,
    minOrderValue: 8_000_000,
    maxUses: 15,
    expiresAt: new Date('2026-10-31T23:59:59.000Z'),
  },
  {
    code: 'LIMITEDVIP1M',
    label: 'VIP giới hạn 1 triệu',
    description: 'Giảm 1.000.000đ cho booking cao cấp, giới hạn ít lượt dùng để tạo cảm giác đặc quyền.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 1_000_000,
    minOrderValue: 10_000_000,
    maxUses: 12,
    expiresAt: new Date('2026-10-31T23:59:59.000Z'),
  },

  // Tour giảm giá sâu: mức giảm mạnh, min order cao hơn để bảo vệ biên lợi nhuận.
  {
    code: 'MEGA25',
    label: 'Mega Sale 25%',
    description: 'Giảm sâu 25% cho booking giá trị cao, dùng để demo chiến dịch khuyến mãi mạnh trên trang promotions.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 25,
    minOrderValue: 6_000_000,
    maxUses: 120,
    expiresAt: new Date('2026-12-31T23:59:59.000Z'),
  },
  {
    code: 'DEEP1M',
    label: 'Giảm sâu 1 triệu',
    description: 'Giảm trực tiếp 1.000.000đ cho các tour cao cấp hoặc nhóm gia đình có tổng giá trị lớn.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 1_000_000,
    minOrderValue: 8_000_000,
    maxUses: 100,
    expiresAt: new Date('2026-12-31T23:59:59.000Z'),
  },
  {
    code: 'SUPER30',
    label: 'Super Deal 30%',
    description: 'Giảm 30% cho chiến dịch giảm giá sâu có kiểm soát, yêu cầu đơn tối thiểu cao.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 30,
    minOrderValue: 9_000_000,
    maxUses: 80,
    expiresAt: new Date('2026-12-15T23:59:59.000Z'),
  },
  {
    code: 'LUXURY2M',
    label: 'Luxury giảm 2 triệu',
    description: 'Giảm 2.000.000đ cho booking hạng cao cấp, phù hợp tour nghỉ dưỡng hoặc tour quốc tế.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 2_000_000,
    minOrderValue: 15_000_000,
    maxUses: 60,
    expiresAt: new Date('2026-12-15T23:59:59.000Z'),
  },
  {
    code: 'FAMILYDEEP22',
    label: 'Gia đình giảm sâu 22%',
    description: 'Giảm 22% cho booking gia đình giá trị lớn, hỗ trợ demo tính toán giảm theo phần trăm.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 22,
    minOrderValue: 7_000_000,
    maxUses: 90,
    expiresAt: new Date('2026-11-30T23:59:59.000Z'),
  },
  {
    code: 'HOLIDAY1500K',
    label: 'Holiday giảm 1.5 triệu',
    description: 'Giảm 1.500.000đ cho kỳ nghỉ lễ, áp dụng với booking đạt điều kiện giá trị tối thiểu.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 1_500_000,
    minOrderValue: 12_000_000,
    maxUses: 70,
    expiresAt: new Date('2026-11-30T23:59:59.000Z'),
  },
  {
    code: 'LASTMINUTE28',
    label: 'Last Minute 28%',
    description: 'Giảm 28% cho khách quyết định nhanh, thích hợp mô phỏng chiến dịch lấp ghế sát ngày.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 28,
    minOrderValue: 6_500_000,
    maxUses: 50,
    expiresAt: new Date('2026-11-15T23:59:59.000Z'),
  },
  {
    code: 'PREMIUM2500K',
    label: 'Premium giảm 2.5 triệu',
    description: 'Giảm 2.500.000đ cho tour premium, min order cao để bảo vệ lợi nhuận khi giảm sâu.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 2_500_000,
    minOrderValue: 18_000_000,
    maxUses: 45,
    expiresAt: new Date('2026-11-15T23:59:59.000Z'),
  },
  {
    code: 'MEGA35',
    label: 'Mega Deal 35%',
    description: 'Giảm 35% cho chiến dịch đặc biệt, số lượt dùng vừa phải và yêu cầu đơn giá trị cao.',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 35,
    minOrderValue: 12_000_000,
    maxUses: 40,
    expiresAt: new Date('2026-10-31T23:59:59.000Z'),
  },
  {
    code: 'ULTRA3M',
    label: 'Ultra giảm 3 triệu',
    description: 'Giảm 3.000.000đ cho các booking rất cao cấp, dùng để demo voucher fixed amount giá trị lớn.',
    discountType: DiscountType.FIXED_AMOUNT,
    discountValue: 3_000_000,
    minOrderValue: 25_000_000,
    maxUses: 30,
    expiresAt: new Date('2026-10-31T23:59:59.000Z'),
  },
];

const VOUCHER_TEXT_EN: Record<string, { labelEn: string; descriptionEn: string }> = {
  AZUREWELCOME: {
    labelEn: 'Azure Horizon Welcome',
    descriptionEn:
      'Get 5% off any tour for new customers. Great for trying out the save-voucher, apply-code and checkout flow.',
  },
  WEEKDAY5: {
    labelEn: 'Weekday Deal',
    descriptionEn:
      'Save 5% on tours departing on weekdays, encouraging off-peak travel dates.',
  },
  FAMILY300K: {
    labelEn: 'Family Getaway',
    descriptionEn:
      'Save 300,000đ on family bookings of two or more guests, valid on most domestic tours.',
  },
  CITYTOUR150K: {
    labelEn: 'City Tour Saver',
    descriptionEn:
      'Save 150,000đ on city sightseeing tours, ideal for short-trip groups.',
  },
  BEACH7: {
    labelEn: 'Blue Sea Season',
    descriptionEn:
      'Save 7% on beach tours, great for Da Nang, Nha Trang, Quy Nhon or Phu Quoc trips.',
  },
  HERITAGE200K: {
    labelEn: 'Heritage Mark',
    descriptionEn:
      'Save 200,000đ on culture, old-town, heritage and traditional craft-village tours.',
  },
  COUPLE6: {
    labelEn: 'Couple Escape',
    descriptionEn:
      'Save 6% on bookings for two, ideal for resort stays or weekend city breaks.',
  },
  LOCAL100K: {
    labelEn: 'Nearby Departure',
    descriptionEn:
      'Save 100,000đ on short or local tours with a lower order value.',
  },
  GROUP8: {
    labelEn: 'Friends On The Go',
    descriptionEn:
      'Save 8% for groups with a total booking value from 5,000,000đ, supporting group sales.',
  },
  RETURN250K: {
    labelEn: 'Returning Guest',
    descriptionEn:
      'Save 250,000đ for loyal customers booking their next trip with Azure Horizon.',
  },
  LIMITED10: {
    labelEn: 'Limited 10 Slots',
    descriptionEn:
      'Save 10% for the first 10 uses. Demonstrates the limited-voucher and sold-out states.',
  },
  LIMITED500K: {
    labelEn: '500K Limited Quantity',
    descriptionEn:
      'Save 500,000đ on a limited number of bookings, fit for short-term demand campaigns.',
  },
  EARLYBIRD12: {
    labelEn: 'Limited Early Bird',
    descriptionEn:
      'Save 12% for early bookers, with limited uses to keep the promo budget in check.',
  },
  WEEKEND300K: {
    labelEn: 'Limited Weekend',
    descriptionEn:
      'Save 300,000đ on weekend tours, limited to 35 uses in a short campaign.',
  },
  SEATSALE15: {
    labelEn: 'Seat Sale 15%',
    descriptionEn:
      'Save 15% on tours that need to fill remaining seats, capped to stay within budget.',
  },
  LIMITEDHA500: {
    labelEn: 'Hanoi Limited 500K',
    descriptionEn:
      'Save 500,000đ on Hanoi or northern tours, with limited uses during the campaign.',
  },
  LIMITEDSEA18: {
    labelEn: 'Limited Summer Sea',
    descriptionEn:
      'Save 18% on select beach tours, limited to the first 18 uses.',
  },
  FLASH400K: {
    labelEn: 'Flash 400K',
    descriptionEn:
      'A quick 400,000đ off bookings meeting the minimum value, ideal for flash-sale displays.',
  },
  LIMITEDGROUP20: {
    labelEn: 'Limited Group 20%',
    descriptionEn:
      'Save 20% for groups booking high-value tours, with low usage to demo premium campaigns.',
  },
  LIMITEDVIP1M: {
    labelEn: 'VIP Limited 1 Million',
    descriptionEn:
      'Save 1,000,000đ on premium bookings, with few uses to create a sense of exclusivity.',
  },
  MEGA25: {
    labelEn: 'Mega Sale 25%',
    descriptionEn:
      'A deep 25% off high-value bookings, to demo strong promotions on the promotions page.',
  },
  DEEP1M: {
    labelEn: 'Deep Cut 1 Million',
    descriptionEn:
      'A direct 1,000,000đ off premium tours or high-value family groups.',
  },
  SUPER30: {
    labelEn: 'Super Deal 30%',
    descriptionEn:
      'Save 30% in a controlled deep-discount campaign requiring a high minimum order.',
  },
  LUXURY2M: {
    labelEn: 'Luxury 2 Million Off',
    descriptionEn:
      'Save 2,000,000đ on premium-class bookings, fit for resort or international tours.',
  },
  FAMILYDEEP22: {
    labelEn: 'Family Deep 22%',
    descriptionEn:
      'Save 22% on high-value family bookings, to demo percentage-based discounts.',
  },
  HOLIDAY1500K: {
    labelEn: 'Holiday 1.5 Million Off',
    descriptionEn:
      'Save 1,500,000đ for holidays, applied to bookings meeting the minimum value.',
  },
  LASTMINUTE28: {
    labelEn: 'Last Minute 28%',
    descriptionEn:
      'Save 28% for quick decision-makers, ideal for simulating last-minute seat-filling campaigns.',
  },
  PREMIUM2500K: {
    labelEn: 'Premium 2.5 Million Off',
    descriptionEn:
      'Save 2,500,000đ on premium tours, with a high minimum order to protect margins on deep discounts.',
  },
  MEGA35: {
    labelEn: 'Mega Deal 35%',
    descriptionEn:
      'Save 35% in a special campaign with moderate usage and a high minimum order value.',
  },
  ULTRA3M: {
    labelEn: 'Ultra 3 Million Off',
    descriptionEn:
      'Save 3,000,000đ on very premium bookings, to demo a large fixed-amount voucher.',
  },
};

export async function seedVouchers(prisma: PrismaClient) {
  for (const voucher of vouchers) {
    const voucherData = {
      label: voucher.label,
      labelEn: VOUCHER_TEXT_EN[voucher.code]?.labelEn ?? null,
      description: voucher.description,
      descriptionEn: VOUCHER_TEXT_EN[voucher.code]?.descriptionEn ?? null,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscountAmount: voucher.maxDiscountAmount ?? null,
      minOrderValue: voucher.minOrderValue,
      maxUses: voucher.maxUses,
      usageLimitPerUser: voucher.usageLimitPerUser ?? null,
      startsAt: voucher.startsAt ?? DEFAULT_PUBLIC_VOUCHER_STARTS_AT,
      expiresAt: voucher.expiresAt,
      isActive: voucher.isActive ?? true,
      isStackable: voucher.isStackable ?? false,
      eligibleTourIds: voucher.eligibleTourIds ?? [],
      eligibleDestinationIds: voucher.eligibleDestinationIds ?? [],
      eligibleCustomerSegments: voucher.eligibleCustomerSegments ?? [],
    };

    await prisma.voucher.upsert({
      where: { code: voucher.code },
      update: voucherData,
      create: {
        code: voucher.code,
        ...voucherData,
      },
    });
  }

  const [standard, limited, deepDiscount] = await Promise.all([
    prisma.voucher.count({
      where: {
        code: {
          in: [
            'AZUREWELCOME',
            'WEEKDAY5',
            'FAMILY300K',
            'CITYTOUR150K',
            'BEACH7',
            'HERITAGE200K',
            'COUPLE6',
            'LOCAL100K',
            'GROUP8',
            'RETURN250K',
          ],
        },
      },
    }),
    prisma.voucher.count({
      where: {
        code: {
          in: [
            'LIMITED10',
            'LIMITED500K',
            'EARLYBIRD12',
            'WEEKEND300K',
            'SEATSALE15',
            'LIMITEDHA500',
            'LIMITEDSEA18',
            'FLASH400K',
            'LIMITEDGROUP20',
            'LIMITEDVIP1M',
          ],
        },
      },
    }),
    prisma.voucher.count({
      where: {
        code: {
          in: [
            'MEGA25',
            'DEEP1M',
            'SUPER30',
            'LUXURY2M',
            'FAMILYDEEP22',
            'HOLIDAY1500K',
            'LASTMINUTE28',
            'PREMIUM2500K',
            'MEGA35',
            'ULTRA3M',
          ],
        },
      },
    }),
  ]);

  console.table([
    { group: 'Tour thường', count: standard },
    { group: 'Tour giới hạn', count: limited },
    { group: 'Tour giảm giá sâu', count: deepDiscount },
  ]);
}
