import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ─────────────────────────────────────────────────────────────────────────────
// Gia hạn lịch khởi hành (rolling departures).
//
// Trang khách chỉ hiển thị tour còn ngày khởi hành ở tương lai (>= ngày mai, khớp
// getMinBookableDate). Tour nào có toàn bộ departure trong quá khứ sẽ bị ẩn dù vẫn
// PUBLISHED. Script này tìm các tour đang bị ẩn và DỜI nguyên cụm lịch của chúng về
// tương lai — giữ nguyên giá, số ghế, transport, khoảng cách giữa các ngày — để tour
// hiện lại mà không cần tạo dữ liệu mới.
//
// An toàn & idempotent: tour nào đã có ngày khởi hành tương lai sẽ được bỏ qua. Chỉ
// đụng tới tour PUBLISHED chưa bị xoá. Dùng --dry-run để xem trước khi ghi.
// ─────────────────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL chưa được cấu hình. Vui lòng thiết lập trong file .env.');
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as never);
const prisma = new PrismaClient({ adapter });

const DAY = 86_400_000;
// Ngày khởi hành sớm nhất sau khi dời sẽ cách hôm nay bấy nhiêu ngày (cho tự nhiên,
// không phải "mai đi luôn"). Các ngày sau giữ nguyên khoảng cách gốc.
const LEAD_DAYS = 14;

const isDryRun = process.argv.includes('--dry-run');

function midnightUtc(d: Date): Date {
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY);
}
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const today = midnightUtc(new Date());
  const minBookable = addDays(today, 1); // khớp getMinBookableDate() = hôm nay + 1
  const targetFirst = addDays(today, LEAD_DAYS);

  const tours = await prisma.tour.findMany({
    where: { deletedAt: null, status: 'PUBLISHED' },
    include: {
      departures: { include: { transport: true }, orderBy: { departureDate: 'asc' } },
    },
  });

  let shifted = 0;
  let bumpedStartOnly = 0;
  let skipped = 0;

  for (const tour of tours) {
    const hasFutureActive = tour.departures.some(
      (d) => d.isActive && d.departureDate >= minBookable,
    );
    const startFuture = tour.startDate >= minBookable;

    if (hasFutureActive || startFuture) {
      skipped++;
      continue;
    }

    // Tour không có lịch nào → chỉ cần đẩy startDate lên tương lai để hiện lại.
    if (tour.departures.length === 0) {
      console.log(`• [startDate] #${tour.id} "${tour.name}" → ${fmt(targetFirst)}`);
      if (!isDryRun) {
        await prisma.tour.update({
          where: { id: tour.id },
          data: { startDate: targetFirst },
        });
      }
      bumpedStartOnly++;
      continue;
    }

    const earliest = tour.departures[0].departureDate;
    const deltaDays = Math.round(
      (targetFirst.getTime() - midnightUtc(earliest).getTime()) / DAY,
    );
    if (deltaDays <= 0) {
      skipped++;
      continue;
    }

    const newDates = tour.departures
      .map((d) => fmt(addDays(d.departureDate, deltaDays)))
      .join(', ');
    console.log(`• [shift +${deltaDays}d] #${tour.id} "${tour.name}" → ${newDates}`);

    if (!isDryRun) {
      await prisma.$transaction([
        ...tour.departures.map((d) =>
          prisma.tourDeparture.update({
            where: { id: d.id },
            data: {
              departureDate: addDays(d.departureDate, deltaDays),
              ...(d.flashSaleEndsAt
                ? { flashSaleEndsAt: addDays(d.flashSaleEndsAt, deltaDays) }
                : {}),
            },
          }),
        ),
        ...tour.departures
          .filter((d) => d.transport)
          .map((d) => {
            const t = d.transport!;
            return prisma.tourDepartureTransport.update({
              where: { id: t.id },
              data: {
                ...(t.boardingTime ? { boardingTime: addDays(t.boardingTime, deltaDays) } : {}),
                ...(t.departureTime ? { departureTime: addDays(t.departureTime, deltaDays) } : {}),
                ...(t.arrivalTime ? { arrivalTime: addDays(t.arrivalTime, deltaDays) } : {}),
                ...(t.returnDepartureTime
                  ? { returnDepartureTime: addDays(t.returnDepartureTime, deltaDays) }
                  : {}),
                ...(t.returnArrivalTime
                  ? { returnArrivalTime: addDays(t.returnArrivalTime, deltaDays) }
                  : {}),
              },
            });
          }),
        prisma.tour.update({
          where: { id: tour.id },
          data: { startDate: addDays(tour.startDate, deltaDays) },
        }),
      ]);
    }
    shifted++;
  }

  console.log('─'.repeat(60));
  console.log(
    `${isDryRun ? '[DRY-RUN] ' : ''}Dời lịch: ${shifted} tour | bump startDate: ${bumpedStartOnly} | ` +
      `bỏ qua (đang hiển thị): ${skipped} | tổng PUBLISHED: ${tours.length}`,
  );
  if (isDryRun) console.log('Chưa ghi gì vào DB. Bỏ --dry-run để áp dụng.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
