import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// ─────────────────────────────────────────────────────────────────────────────
// SEED REVIEW
// Logic:
//  1. Upsert N tài khoản CUSTOMER fake (email/pass cố định để tái seed được)
//  2. Với mỗi tour đang PUBLISHED, upsert booking CONFIRMED+PAID cho từng user
//  3. Insert review (skip nếu đã tồn tại) rồi recalc averageRating
// ─────────────────────────────────────────────────────────────────────────────

// ── Dữ liệu khách hàng fake ──────────────────────────────────────────────────

const FAKE_CUSTOMERS = [
  { email: 'minh.nguyen.traveler@gmail.com',  fullName: 'Nguyễn Văn Minh',    phone: '0901234501', avatarUrl: 'https://i.pravatar.cc/150?img=1'  },
  { email: 'lan.pham.explorer@gmail.com',     fullName: 'Phạm Thị Lan',       phone: '0901234502', avatarUrl: 'https://i.pravatar.cc/150?img=2'  },
  { email: 'tuan.tran.adventure@gmail.com',   fullName: 'Trần Quốc Tuấn',     phone: '0901234503', avatarUrl: 'https://i.pravatar.cc/150?img=3'  },
  { email: 'huong.le.journey@gmail.com',      fullName: 'Lê Thị Hương',       phone: '0901234504', avatarUrl: 'https://i.pravatar.cc/150?img=4'  },
  { email: 'duc.vo.wanderer@gmail.com',       fullName: 'Võ Hoàng Đức',       phone: '0901234505', avatarUrl: 'https://i.pravatar.cc/150?img=5'  },
  { email: 'mai.bui.sunshine@gmail.com',      fullName: 'Bùi Ngọc Mai',       phone: '0901234506', avatarUrl: 'https://i.pravatar.cc/150?img=6'  },
  { email: 'khoa.dang.nomad@gmail.com',       fullName: 'Đặng Minh Khoa',     phone: '0901234507', avatarUrl: 'https://i.pravatar.cc/150?img=7'  },
  { email: 'thu.nguyen.horizon@gmail.com',    fullName: 'Nguyễn Thùy Thu',    phone: '0901234508', avatarUrl: 'https://i.pravatar.cc/150?img=8'  },
  { email: 'long.hoang.voyage@gmail.com',     fullName: 'Hoàng Trọng Long',   phone: '0901234509', avatarUrl: 'https://i.pravatar.cc/150?img=9'  },
  { email: 'linh.do.odyssey@gmail.com',       fullName: 'Đỗ Phương Linh',     phone: '0901234510', avatarUrl: 'https://i.pravatar.cc/150?img=10' },
  { email: 'hung.phan.routes@gmail.com',      fullName: 'Phan Văn Hùng',      phone: '0901234511', avatarUrl: 'https://i.pravatar.cc/150?img=11' },
  { email: 'trang.ngo.escapade@gmail.com',    fullName: 'Ngô Bảo Trang',      phone: '0901234512', avatarUrl: 'https://i.pravatar.cc/150?img=12' },
  { email: 'hieu.dinh.roamer@gmail.com',      fullName: 'Đinh Thanh Hiếu',    phone: '0901234513', avatarUrl: 'https://i.pravatar.cc/150?img=13' },
  { email: 'vy.truong.passport@gmail.com',    fullName: 'Trương Ngọc Vy',     phone: '0901234514', avatarUrl: 'https://i.pravatar.cc/150?img=14' },
  { email: 'nam.ly.discovery@gmail.com',      fullName: 'Lý Hoàng Nam',       phone: '0901234515', avatarUrl: 'https://i.pravatar.cc/150?img=15' },
];

// ── Pool nội dung review theo rating ─────────────────────────────────────────

type ReviewTemplate = { rating: number; content: string; adminReply?: string };

const REVIEW_POOL: ReviewTemplate[] = [
  // 5 SAO
  {
    rating: 5,
    content:
      'Chuyến đi tuyệt vời! Hướng dẫn viên nhiệt tình, am hiểu lịch sử địa phương và rất vui tính. Lịch trình sắp xếp hợp lý, không bị vội vàng. Ăn uống đặc sản ngon, khách sạn sạch sẽ đúng chuẩn. Sẽ giới thiệu cho bạn bè và gia đình.',
    adminReply:
      'Cảm ơn bạn đã dành thời gian chia sẻ! Chúng tôi rất vui khi hành trình đáp ứng được kỳ vọng. Hẹn gặp lại bạn trong chuyến tiếp theo nhé! 🌟',
  },
  {
    rating: 5,
    content:
      'Mình đã đặt tour cho cả gia đình 6 người, từ lúc đặt cho đến khi về đều được hỗ trợ rất chu đáo. Điểm đến đẹp hơn mình tưởng, hướng dẫn viên giải thích tỉ mỉ từng điểm tham quan. Giá cả hợp lý so với chất lượng dịch vụ nhận được.',
  },
  {
    rating: 5,
    content:
      'Đây là lần thứ ba mình đặt tour ở đây và lần nào cũng hài lòng. Phòng khách sạn rộng rãi, bữa ăn ngon, xe du lịch mới và sạch. Đặc biệt là hướng dẫn viên rất hiểu tâm lý khách, biết lúc nào nên cho thời gian tự do.',
    adminReply:
      'Cảm ơn sự tin tưởng liên tục của bạn! Đó là động lực lớn nhất để chúng tôi cải thiện dịch vụ mỗi ngày. Chúc bạn và gia đình luôn khỏe mạnh! ❤️',
  },
  {
    rating: 5,
    content:
      'Tour rất chuyên nghiệp từ khâu tư vấn đến khi kết thúc hành trình. Mọi thủ tục đều được lo chu toàn, không phải tự mình lo lắng gì. Cảnh đẹp, đồ ăn ngon và không khí trong lành. Chắc chắn sẽ quay lại!',
  },
  {
    rating: 5,
    content:
      'Chưa bao giờ mình đi tour mà vui và thoải mái như vậy. Đoàn đi cũng vui vẻ, hướng dẫn viên như người bạn đồng hành hơn là nhân viên. Điểm trừ nhỏ là xe hơi chật nhưng vẫn trong ngưỡng chấp nhận được.',
  },
  // 4 SAO
  {
    rating: 4,
    content:
      'Nhìn chung tour khá tốt, hướng dẫn viên nhiệt tình và kiến thức tốt. Lịch trình đầy đủ, đúng như quảng cáo. Chỉ tiếc khách sạn hơi xa trung tâm một chút nên việc tự đi ăn tối không tiện lắm. Vẫn sẽ giới thiệu cho bạn bè.',
    adminReply:
      'Cảm ơn phản hồi chân thành của bạn! Chúng tôi sẽ cân nhắc điều chỉnh lựa chọn khách sạn gần hơn cho các đoàn tiếp theo. Rất mong được đón bạn trong chuyến tới!',
  },
  {
    rating: 4,
    content:
      'Tour có lịch trình hợp lý, không bị nhồi nhét quá nhiều điểm tham quan. Bữa ăn đúng tiêu chuẩn, hướng dẫn viên vui tính. Trừ một điểm vì xe hơi bị muộn lúc đón sáng, nhưng sau đó mọi thứ đều suôn sẻ.',
  },
  {
    rating: 4,
    content:
      'Dịch vụ tốt so với mức giá. Đặc biệt ấn tượng với cách hướng dẫn viên xử lý tình huống khi có thành viên trong đoàn bị say xe - rất chuyên nghiệp và tận tâm. Sẽ cân nhắc đặt thêm tour khác trong tương lai.',
  },
  {
    rating: 4,
    content:
      'Mình đặt tour cho lần đầu đi và thấy khá ổn. Giá không quá đắt, dịch vụ đúng như mô tả. Điểm mình muốn góp ý là nên thêm 1 điểm dừng nghỉ trong hành trình di chuyển dài. Tổng thể 4/5.',
  },
  // 3 SAO
  {
    rating: 3,
    content:
      'Tour ở mức trung bình. Một số điểm trong lịch trình không đúng như mô tả do thời tiết, điều này có thể hiểu được. Hướng dẫn viên tốt nhưng ăn uống hơi đơn điệu. Mình kỳ vọng hơn một chút ở mức giá này.',
    adminReply:
      'Cảm ơn bạn đã phản hồi thẳng thắn. Chúng tôi xin lỗi vì trải nghiệm chưa đạt kỳ vọng. Chúng tôi sẽ cải thiện thực đơn và bổ sung thêm lựa chọn ăn uống cho đoàn. Rất mong có cơ hội phục vụ bạn tốt hơn!',
  },
  {
    rating: 3,
    content:
      'Tour đúng lịch, hướng dẫn viên có kiến thức nhưng nói hơi nhanh, khó theo dõi. Khách sạn sạch nhưng tiện nghi cơ bản. Nếu cải thiện được phần ăn uống thì sẽ tốt hơn nhiều. Mức 3 sao là phù hợp.',
  },
  // 2 SAO
  {
    rating: 2,
    content:
      'Trải nghiệm không như mong đợi. Hướng dẫn viên thiếu nhiệt tình, lịch trình bị thay đổi đột ngột mà không thông báo trước. Bữa ăn không đúng thực đơn đã đăng. Mong công ty xem xét và cải thiện chất lượng dịch vụ.',
    adminReply:
      'Chúng tôi thành thật xin lỗi vì những bất tiện bạn đã gặp phải. Đây là phản hồi quan trọng để chúng tôi cải thiện. Bộ phận chăm sóc khách hàng sẽ liên hệ với bạn trong 24h để hỗ trợ thêm.',
  },
];

// ── Hàm chọn review ngẫu nhiên không trùng lặp theo user+tour ────────────────

function pickReview(seed: number): ReviewTemplate {
  return REVIEW_POOL[seed % REVIEW_POOL.length];
}

// ── Ngày quá khứ cố định để booking/trip đã hoàn thành ───────────────────────

function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(8, 0, 0, 0);
  return d;
}

function seedPaymentSource(seed: number): string {
  const sources = ['PAYOS_RETURN_SYNC', 'PAYOS_WEBHOOK', 'IN_STORE_BANK_TRANSFER', 'IN_STORE_CASH'];
  return sources[seed % sources.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function seedReviews(prisma: PrismaClient) {
  const SEED_PASSWORD = 'Seed@Review2026';
  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

  // 1. Upsert fake customers ─────────────────────────────────────────────────
  console.log('  → Upserting fake customer accounts...');
  const customerIds: number[] = [];

  for (const c of FAKE_CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: { fullName: c.fullName, phone: c.phone, avatarUrl: c.avatarUrl },
      create: {
        email: c.email,
        password: hashedPassword,
        fullName: c.fullName,
        phone: c.phone,
        avatarUrl: c.avatarUrl,
        role: 'CUSTOMER',
      },
    });
    customerIds.push(user.id);
  }

  // 2. Lấy tất cả tour PUBLISHED ─────────────────────────────────────────────
  console.log('  → Fetching published tours...');
  const tours = await prisma.tour.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    select: { id: true, price: true, startDate: true, duration: true },
  });

  if (tours.length === 0) {
    console.warn('  ⚠ No published tours found. Run domestic/international seed first.');
    return;
  }

  let totalReviews = 0;
  let skippedReviews = 0;

  // 3. Với mỗi tour, tạo booking + review cho một số fake customers ───────────
  for (let ti = 0; ti < tours.length; ti++) {
    const tour = tours[ti];

    // Số lượng reviewer mỗi tour: 3–8 người (xoay vòng theo index tour)
    const reviewerCount = 3 + (ti % 6);
    const reviewerIndices = customerIds
      .slice(0, reviewerCount)
      .map((_, i) => (i + ti) % customerIds.length);

    for (let ri = 0; ri < reviewerCount; ri++) {
      const userId = customerIds[reviewerIndices[ri]];
      const reviewSeed = ti * 100 + ri;
      const template = pickReview(reviewSeed);
      const bookingDaysAgo = 1 + (reviewSeed % 28);
      const bookingDate = pastDate(bookingDaysAgo);
      const reviewDate = pastDate(Math.max(0, bookingDaysAgo - 1));
      const numberOfPeople = 1 + (ri % 3);
      const totalPrice = tour.price * numberOfPeople;

      // 3a. Upsert booking CONFIRMED+PAID ──────────────────────────────────
      const existingBooking = await prisma.booking.findFirst({
        where: { userId, tourId: tour.id, status: 'CONFIRMED', paymentStatus: 'PAID' },
      });

      const booking = existingBooking
        ? await prisma.booking.update({
          where: { id: existingBooking.id },
          data: {
            numberOfPeople,
            totalPrice,
            unitPriceAtBooking: tour.price,
            paymentMethod: 'PAYOS',
            createdAt: bookingDate,
            updatedAt: bookingDate,
            deletedAt: null,
          },
        })
        : await prisma.booking.create({
          data: {
            userId,
            tourId: tour.id,
            numberOfPeople,
            totalPrice,
            unitPriceAtBooking: tour.price,
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            paymentMethod: 'PAYOS',
            createdAt: bookingDate,
            updatedAt: bookingDate,
          },
        });

      const transactionRef = `SEED-PAID-${booking.id}`;
      const paymentSource = seedPaymentSource(reviewSeed);
      const existingTransaction = await prisma.paymentTransaction.findFirst({
        where: { bookingId: booking.id, transactionRef },
      });

      const transactionData = {
        gateway: paymentSource.startsWith('IN_STORE') ? 'MANUAL' : 'PAYOS',
        transactionRef,
        amount: totalPrice,
        status: 'SUCCESS',
        rawPayload: JSON.stringify({ source: 'review-seed', bookingId: booking.id }),
        confirmedSource: paymentSource,
        confirmedAt: bookingDate,
        confirmedNote: 'Seed demo dashboard revenue',
        createdAt: bookingDate,
      };

      if (existingTransaction) {
        await prisma.paymentTransaction.update({
          where: { id: existingTransaction.id },
          data: transactionData,
        });
      } else {
        await prisma.paymentTransaction.create({
          data: {
            bookingId: booking.id,
            ...transactionData,
          },
        });
      }

      // 3b. Insert review nếu chưa có ──────────────────────────────────────
      const existingReview = await prisma.review.findFirst({
        where: { userId, tourId: tour.id },
      });

      if (existingReview) {
        skippedReviews++;
        continue;
      }

      await prisma.review.create({
        data: {
          userId,
          tourId: tour.id,
          rating: template.rating,
          content: template.content,
          imageUrls: [],
          isHidden: false,
          adminReply: template.adminReply ?? null,
          createdAt: reviewDate,
          updatedAt: reviewDate,
        },
      });
      totalReviews++;
    }

    // 3c. Recalc averageRating sau khi seed xong tour ────────────────────────
    const agg = await prisma.review.aggregate({
      where: { tourId: tour.id, isHidden: false },
      _avg: { rating: true },
    });
    await prisma.tour.update({
      where: { id: tour.id },
      data: { averageRating: Number((agg._avg.rating ?? 0).toFixed(1)) },
    });
  }

  // 4. Summary ───────────────────────────────────────────────────────────────
  const totalInDb = await prisma.review.count();
  console.table([
    { metric: 'Fake customers upserted', value: customerIds.length },
    { metric: 'Tours processed',         value: tours.length },
    { metric: 'Reviews created',         value: totalReviews },
    { metric: 'Reviews skipped (exist)', value: skippedReviews },
    { metric: 'Total reviews in DB',     value: totalInDb },
  ]);
}
