/**
 * migrate-tour-types.ts
 * Chuẩn hóa tourType trong DB về canonical list.
 * Chạy: npx ts-node prisma/seeds/migrate-tour-types.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL chưa được cấu hình. Vui lòng thiết lập trong file .env.');
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as never);
const prisma = new PrismaClient({ adapter });

/** Bộ 6 loại tour chuẩn — phải khớp với TOUR_TYPES trong constants.ts */
export const CANONICAL_TOUR_TYPES = [
  'Tour Gia Đình',
  'Tour Cao Cấp',
  'Nghỉ Dưỡng',
  'Khám Phá',
  'Văn Hóa & Lịch Sử',
  'Tour Ghép Đoàn',
] as const;

/** Map từ giá trị cũ → canonical */
const MIGRATION_MAP: Record<string, string> = {
  // International (không dấu)
  'Cao Cap':            'Tour Cao Cấp',
  'Nghi Duong':         'Nghỉ Dưỡng',
  'City Break':         'Nghỉ Dưỡng',
  'Van Hoa & Lich Su':  'Văn Hóa & Lịch Sử',
  'Van Hoa & Giai Tri': 'Văn Hóa & Lịch Sử',
  'Tour Pho Bien':      'Khám Phá',
  'Tour Kinh Dien':     'Khám Phá',
  'Chau Au Kinh Dien':  'Văn Hóa & Lịch Sử',
  // Domestic extra
  'Văn Hóa & Ẩm Thực':  'Văn Hóa & Lịch Sử',
  'Văn Hóa & Nghỉ Dưỡng': 'Nghỉ Dưỡng',
  // Default fallback
  'Luxury Retreat':     'Tour Cao Cấp',
};

async function main() {
  console.log('🔄 Bắt đầu chuẩn hóa tourType...\n');

  // Lấy tất cả giá trị tourType distinct hiện tại
  const distinctTypes = await prisma.tour.groupBy({
    by: ['tourType'],
    _count: { tourType: true },
  });

  console.log('📋 Danh sách tourType hiện tại trong DB:');
  for (const item of distinctTypes) {
    const canonical = CANONICAL_TOUR_TYPES.includes(item.tourType as typeof CANONICAL_TOUR_TYPES[number]);
    const mapped = MIGRATION_MAP[item.tourType];
    const status = canonical ? '✅ Chuẩn' : mapped ? `⚠️ → ${mapped}` : '❌ Không xác định';
    console.log(`  ${status} | "${item.tourType}" (${item._count.tourType} tour)`);
  }

  console.log('\n🔧 Tiến hành migration...');

  let totalUpdated = 0;

  for (const [oldValue, newValue] of Object.entries(MIGRATION_MAP)) {
    const result = await prisma.tour.updateMany({
      where: { tourType: oldValue },
      data: { tourType: newValue },
    });
    if (result.count > 0) {
      console.log(`  ✅ "${oldValue}" → "${newValue}": ${result.count} tour`);
      totalUpdated += result.count;
    }
  }

  // Các giá trị không nằm trong canonical và không có mapping → set về 'Tour Cao Cấp' (fallback)
  const remainingDistinct = await prisma.tour.groupBy({
    by: ['tourType'],
    _count: { tourType: true },
  });

  for (const item of remainingDistinct) {
    if (!CANONICAL_TOUR_TYPES.includes(item.tourType as typeof CANONICAL_TOUR_TYPES[number])) {
      const result = await prisma.tour.updateMany({
        where: { tourType: item.tourType },
        data: { tourType: 'Khám Phá' }, // fallback hợp lý nhất
      });
      if (result.count > 0) {
        console.log(`  🔁 Fallback: "${item.tourType}" → "Khám Phá": ${result.count} tour`);
        totalUpdated += result.count;
      }
    }
  }

  console.log(`\n✅ Hoàn thành! Đã cập nhật ${totalUpdated} tour.`);

  // Xác nhận lại
  console.log('\n📋 Kết quả sau migration:');
  const finalTypes = await prisma.tour.groupBy({
    by: ['tourType'],
    _count: { tourType: true },
    orderBy: { _count: { tourType: 'desc' } },
  });
  for (const item of finalTypes) {
    console.log(`  "${item.tourType}": ${item._count.tourType} tour`);
  }
}

main()
  .catch((e) => { console.error('❌ Lỗi:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
