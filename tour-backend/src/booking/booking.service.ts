import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PaymentService } from '../payment/payment.service';
import { VoucherService } from '../voucher/voucher.service';
import { MailService } from '../mail/mail.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly voucherService: VoucherService,
    private readonly mailService: MailService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

  // Hàm hỗ trợ tạo mã Booking chuyên nghiệp
  private generateBookingCode(): string {
    const prefix = 'BKG';

    // Lấy ngày tháng năm hiện tại (VD: 290326)
    const date = new Date();
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    const dateString = `${d}${m}${y}`;

    // Tạo 4 ký tự ngẫu nhiên (Chữ in hoa + Số)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomString = '';
    for (let i = 0; i < 4; i++) {
      randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}-${dateString}-${randomString}`;
  }

  async create(userId: number, dto: CreateBookingDto, ip: string) {
    // ============== INTERACTIVE TRANSACTION ==============
    // Bọc toàn bộ logic trong 1 transaction để đảm bảo tính nguyên tử:
    // Nếu BẤT KỲ bước nào bên trong lỗi → rollback TẤT CẢ, không mất ghế.
    const booking = await this.prisma.$transaction(async (tx) => {
      // 1. Tìm tour và khóa dòng dữ liệu
      const tour = await tx.tour.findUnique({
        where: { id: dto.tourId, deletedAt: null }, // [PHASE 1] Không cho đặt tour đã xóa
      });

      if (!tour) {
        throw new NotFoundException('Tour not found');
      }

      // 1b. Validate departure (nếu có) và kiểm tra ghế của departure đó
      let selectedDeparture: any = null;
      if (dto.departureId) {
        selectedDeparture = await tx.tourDeparture.findUnique({
          where: { id: dto.departureId },
        });
        if (!selectedDeparture || selectedDeparture.tourId !== tour.id) {
          throw new BadRequestException('Invalid departure');
        }
        if (selectedDeparture.availableSeats < dto.numberOfPeople) {
          throw new BadRequestException('Not enough seats for this departure');
        }
      } else {
        // Fallback: kiểm tra ghế trên tour
        if (tour.availableSeats < dto.numberOfPeople) {
          throw new BadRequestException('Not enough seats available');
        }
      }

      let basePrice = selectedDeparture?.price ?? tour.price;
      let selectedPackage: any = null;
      if (dto.packageId) {
        selectedPackage = await tx.tourPackage.findUnique({ where: { id: dto.packageId } });
        if (!selectedPackage || selectedPackage.tourId !== tour.id) {
          throw new BadRequestException('Invalid tour package');
        }
        // [PHASE 2] Phụ thu giá gói vào giá gốc của ngày khởi hành
        basePrice += selectedPackage.price;
      }

      let totalPrice = basePrice * dto.numberOfPeople;
      let discountAmount = 0;
      let voucherCode: string | null = null;

      // 2. Xác thực Voucher (nếu có)
      if (dto.voucherCode) {
        const voucherResult = await this.voucherService.validateVoucher(
          dto.voucherCode,
          totalPrice,
        );
        discountAmount = voucherResult.discountAmount;
        totalPrice = voucherResult.finalPrice;
        voucherCode = dto.voucherCode;
      }

      // 3. Trừ ghế bằng Atomic Decrement
      await tx.tour.update({
        where: { id: tour.id },
        data: { availableSeats: { decrement: dto.numberOfPeople } },
      });

      // Trừ ghế trên TourDeparture nếu có chọn ngày khởi hành
      if (dto.departureId) {
        await tx.tourDeparture.update({
          where: { id: dto.departureId },
          data: { availableSeats: { decrement: dto.numberOfPeople } },
        });
      }

      // 4. Tạo mã Booking chuyên nghiệp
      const newBookingCode = this.generateBookingCode();

      // 5. Tạo record Booking
      const newBooking = await tx.booking.create({
        data: {
          bookingCode: newBookingCode,
          userId,
          tourId: dto.tourId,
          numberOfPeople: dto.numberOfPeople,
          totalPrice,
          unitPriceAtBooking: basePrice, // [PHASE 1] Đóng băng giá vé tại thời điểm đặt
          voucherCode,
          discountAmount,
          departureId: dto.departureId,
          packageId: dto.packageId,
          contactInfo: dto.contactInfo ? (dto.contactInfo as any) : null,
          passengers: dto.passengers ? (dto.passengers as any) : null,
        },
      });

      // 6. Cập nhật lượt dùng Voucher & ví trực tiếp trong Transaction để chống Race Condition
      if (voucherCode) {
        const voucherToUpdate = await tx.voucher.findUnique({
          where: { code: voucherCode },
        });

        if (voucherToUpdate) {
          // Tăng lượt sử dụng một cách an toàn
          const updatedVoucher = await tx.voucher.update({
            where: { id: voucherToUpdate.id },
            data: { usedCount: { increment: 1 } },
          });

          // (Tùy chọn nâng cao): Nếu vượt quá maxUses sau khi increment, ép rollback!
          if (updatedVoucher.usedCount > updatedVoucher.maxUses) {
            throw new BadRequestException('Voucher đã hết lượt sử dụng ngay khoảnh khắc bạn đặt hàng!');
          }

          // Cập nhật trong ví của user (nếu đã lưu)
          const userVoucher = await tx.userVoucher.findUnique({
            where: { userId_voucherId: { userId, voucherId: voucherToUpdate.id } },
          });

          if (userVoucher) {
            await tx.userVoucher.update({
              where: { id: userVoucher.id },
              data: { isUsed: true },
            });
          }
        }
      }

      return newBooking;
    }); // ← Nếu có exception → toàn bộ rollback tự động

    // ============== PAYOS INTEGRATION ==============
    // totalPrice đã là VNĐ (frontend gửi VNĐ, DB lưu VNĐ)
    // PayOS yêu cầu số nguyên VNĐ — làm tròn để loại bỏ số thập phân nếu có
    const amountVND = Math.round(booking.totalPrice);

    // Mô tả hiển thị trên mã QR ngân hàng (tối đa 25 ký tự)
    const description = `AH ${booking.bookingCode}`;

    // Dùng booking.id (số nguyên tự tăng) làm orderCode cho PayOS
    let checkoutUrl: string;
    try {
      checkoutUrl = await this.paymentService.createPaymentLink(
        booking.id,
        amountVND,
        description,
      );
    } catch (payosError: any) {
      // PayOS lỗi 231: Link thanh toán đã tồn tại → lấy lại link cũ thay vì tạo mới
      if (payosError?.code === '231') {
        this.logger.warn(`[BOOKING] PayOS order #${booking.id} đã tồn tại, lấy lại checkout URL.`);
        const existing = await this.paymentService.getPaymentInfo(booking.id);
        if (!existing?.id) {
          throw new BadRequestException('Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.');
        }
        // PaymentLink.id là paymentLinkId, dùng để tạo URL checkout
        checkoutUrl = `https://pay.payos.vn/web/${existing.id}`;
      } else {
        throw payosError;
      }
    }

    // [PHASE 1] Ghi log PaymentTransaction khi tạo link thanh toán
    await this.prisma.paymentTransaction.create({
      data: {
        bookingId: booking.id,
        gateway: 'PAYOS',
        amount: amountVND,
        status: 'PENDING',
      },
    });

    return { message: 'Booking successful, please proceed to payment', booking, paymentUrl: checkoutUrl };
  }

  /**
   * Xử lý khi người dùng quay về từ trang PayOS (hoặc Webhook gọi)
   * Gọi thẳng API PayOS để xác nhận trạng thái thực tế, không tin query params
   */
  async handlePayosReturn(orderCode: number) {
    // 1. Gọi PayOS API để lấy trạng thái thanh toán thực
    const paymentInfo = await this.paymentService.getPaymentInfo(orderCode);

    // 2. Tìm booking theo ID (orderCode = booking.id)
    const booking = await this.prisma.booking.findUnique({
      where: { id: orderCode },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Nếu booking đã xử lý rồi (CONFIRMED hoặc CANCELLED) → bỏ qua, tránh xử lý trùng
    if (booking.status === 'CONFIRMED' || booking.status === 'CANCELLED') {
      return paymentInfo;
    }

    // 3. Cập nhật trạng thái dựa vào kết quả từ PayOS
    if (paymentInfo.status === 'PAID') {
      const txnRef = paymentInfo.transactions?.[0]?.reference || `PAYOS-${orderCode}`;

      await this.prisma.booking.update({
        where: { id: orderCode },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          // Lưu mã tham chiếu giao dịch ngân hàng từ PayOS
          vnpayTxnRef: txnRef,
        },
      });

      // [PHASE 1] Ghi log thanh toán thành công vào PaymentTransaction
      await this.prisma.paymentTransaction.create({
        data: {
          bookingId: orderCode,
          gateway: 'PAYOS',
          transactionRef: txnRef,
          amount: paymentInfo.amount || 0,
          status: 'SUCCESS',
          rawPayload: JSON.stringify(paymentInfo),
        },
      });

      // ── GỬI EMAIL XÁC NHẬN ──
      try {
        const fullBooking = await this.prisma.booking.findUnique({
          where: { id: orderCode },
          include: { user: true, tour: true },
        });

        if (fullBooking?.user?.email) {
          await this.mailService.sendBookingConfirmation({
            to: fullBooking.user.email,
            customerName: fullBooking.user.fullName,
            bookingCode: fullBooking.bookingCode,
            tourName: fullBooking.tour.name,
            startDate: fullBooking.tour.startDate.toLocaleDateString('vi-VN'),
            duration: fullBooking.tour.duration,
            numberOfPeople: fullBooking.numberOfPeople,
            totalPrice: `$${fullBooking.totalPrice.toLocaleString()}`,
            discountAmount: fullBooking.discountAmount > 0 ? `$${fullBooking.discountAmount.toLocaleString()}` : undefined,
          });
        }
      } catch (emailError) {
        this.logger.error('[EMAIL] Lỗi gửi email xác nhận:', emailError);
        // Không throw — email lỗi không ảnh hưởng luồng thanh toán chính
      }
    } else if (paymentInfo.status === 'CANCELLED' || paymentInfo.status === 'EXPIRED') {
      // Hủy booking + hoàn trả ghế cho Tour
      await this.cancelAndRestoreSeats(booking.id, booking.tourId, booking.numberOfPeople);

      // [PHASE 1] Ghi log thanh toán thất bại
      await this.prisma.paymentTransaction.create({
        data: {
          bookingId: orderCode,
          gateway: 'PAYOS',
          amount: paymentInfo.amount || 0,
          status: 'FAILED',
          rawPayload: JSON.stringify(paymentInfo),
        },
      });
    }
    // Nếu status === 'PENDING' → Chưa thanh toán, không thay đổi gì

    return paymentInfo;
  }

  /**
   * Tìm booking theo ID (orderCode của PayOS)
   */
  async findByOrderCode(orderCode: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: orderCode },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  // ============ HELPER: Hủy Booking + Hoàn Trả Ghế ============

  /**
   * Hủy 1 booking cụ thể và cộng lại số ghế vào Tour.
   * Dùng chung cho: PayOS cancel, Webhook cancel, và Cron job tự hủy.
   */
  private async cancelAndRestoreSeats(bookingId: number, tourId: number, numberOfPeople: number) {
    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
        },
      }),
      this.prisma.tour.update({
        where: { id: tourId },
        data: {
          availableSeats: { increment: numberOfPeople },
        },
      }),
    ]);
  }

  /**
   * CRON JOB: Quét đơn hàng PENDING quá 15 phút và tự động hủy + hoàn trả ghế.
   * Được gọi bởi @nestjs/schedule mỗi 5 phút.
   */
  async cancelExpiredBookings() {
    const EXPIRY_MINUTES = 15;
    const expiryTime = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);

    // Tìm tất cả đơn PENDING đã tạo quá 15 phút
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        deletedAt: null, // [PHASE 1] Bỏ qua booking đã xóa mềm
        createdAt: { lt: expiryTime },
      },
    });

    if (expiredBookings.length === 0) return;

    this.logger.log(`[CRON] Tìm thấy ${expiredBookings.length} đơn hàng PENDING quá hạn. Đang hủy...`);

    for (const booking of expiredBookings) {
      await this.cancelAndRestoreSeats(booking.id, booking.tourId, booking.numberOfPeople);
      this.logger.log(`[CRON] Đã hủy booking #${booking.id} (${booking.bookingCode}) và hoàn ${booking.numberOfPeople} ghế cho tour #${booking.tourId}`);
    }

    this.logger.log(`[CRON] Hoàn tất dọn dẹp ${expiredBookings.length} đơn hàng.`);
  }

  // ============ CÁC HÀM CŨ GIỮ NGUYÊN ============

  /**
   * Admin: Xác nhận thủ công booking PENDING
   * Dùng khi khách đã thanh toán ngoài hệ thống (chuyển khoản sai nội dung, tiền mặt, v.v.)
   */
  async confirmManual(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        tour: { select: { id: true, name: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.status === 'CONFIRMED') throw new BadRequestException('Đơn hàng đã được xác nhận trước đó');
    if (booking.status === 'CANCELLED') throw new BadRequestException('Không thể xác nhận đơn hàng đã hủy');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        tour: { select: { id: true, name: true, imageUrl: true, tourCode: true } },
      },
    });

    this.logger.log(`[ADMIN MANUAL] Đã xác nhận thủ công booking #${bookingId} (${booking.bookingCode})`);

    return {
      ...updated,
      totalPrice: Number(updated.totalPrice),
      unitPriceAtBooking: Number(updated.unitPriceAtBooking),
      discountAmount: Number(updated.discountAmount),
    };
  }

  async getMyBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: {
        userId,
        deletedAt: null,
        // Hiện tất cả trạng thái, kể cả CANCELLED và CANCEL_REQUESTED
      },
      include: { tour: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin: Lấy toàn bộ danh sách booking (có filter tùy chọn)
   */
  async getAllBookings(
    status?: string,
    paymentStatus?: string,
    search?: string,
    dateFrom?: string,
    dateTo?: string,
    page = 1,
    limit = 10,
  ) {
    const where: any = {
      deletedAt: null,
    };

    // Không ẩn cancelled nữa ở admin — admin cần thấy để quản lý
    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus.toUpperCase();
    }
    if (search) {
      where.OR = [
        { bookingCode: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { tour: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          tour: { select: { id: true, name: true, imageUrl: true, tourCode: true, destination: { select: { name: true } } } },
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    // Thống kê tổng hợp (toàn bộ, không bị ảnh hưởng bởi filter)
    const [globalStats, revenueResult] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),
      this.prisma.booking.aggregate({
        where: { deletedAt: null, paymentStatus: 'PAID' },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),
    ]);

    const statsMap: Record<string, number> = {};
    for (const s of globalStats) {
      statsMap[s.status] = s._count.status;
    }

    return {
      bookings: bookings.map(b => ({
        ...b,
        totalPrice: Number(b.totalPrice),
        unitPriceAtBooking: Number(b.unitPriceAtBooking),
        discountAmount: Number(b.discountAmount),
      })),
      stats: {
        pending: statsMap['PENDING'] || 0,
        confirmed: statsMap['CONFIRMED'] || 0,
        cancelled: statsMap['CANCELLED'] || 0,
        total: (statsMap['PENDING'] || 0) + (statsMap['CONFIRMED'] || 0),
        totalRevenue: Number(revenueResult._sum.totalPrice || 0),
        paidCount: revenueResult._count.id,
      },
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  /**
   * Khách hàng thanh toán lại booking PENDING (chưa quá 15 phút)
   * Tạo lại PayOS payment link và trả về checkoutUrl
   */
  async retryPayment(bookingId: number, userId: number) {
    const EXPIRY_MINUTES = 15;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tour: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Chỉ cho phép chủ booking thực hiện
    if (booking.userId !== userId) {
      throw new BadRequestException('Không có quyền truy cập booking này');
    }

    // Chỉ cho retry nếu booking vẫn PENDING và chưa thanh toán
    if (booking.status !== 'PENDING' || booking.paymentStatus !== 'UNPAID') {
      throw new BadRequestException('Booking này không ở trạng thái chờ thanh toán');
    }

    // Kiểm tra xem booking đã quá 15 phút chưa
    const expiryTime = new Date(booking.createdAt.getTime() + EXPIRY_MINUTES * 60 * 1000);
    if (new Date() > expiryTime) {
      throw new BadRequestException('Booking đã hết hạn thanh toán (quá 15 phút). Vui lòng đặt tour mới.');
    }

    // Lấy lại checkout URL từ PayOS thay vì tạo mới (tránh lỗi 231 "order đã tồn tại")
    const amountVND = Math.round(booking.totalPrice);
    const description = `AH ${booking.bookingCode}`;
    let checkoutUrl: string;
    try {
      // Thử tạo mới trước
      checkoutUrl = await this.paymentService.createPaymentLink(
        booking.id,
        amountVND,
        description,
      );
    } catch (payosError: any) {
      // PayOS lỗi 231: đã tồn tại PayOS order này → lấy lại link cũ
      if (payosError?.code === '231') {
        this.logger.warn(`[RETRY] PayOS order #${booking.id} đã tồn tại, lấy lại checkout URL.`);
        const existing = await this.paymentService.getPaymentInfo(booking.id);
        if (!existing?.id) {
          throw new BadRequestException(
            'Không thể lấy liên kết thanh toán. Link có thể đã hết hạn. Vui lòng đặt tour mới.'
          );
        }
        // PaymentLink.id là paymentLinkId, dùng để tạo URL checkout
        checkoutUrl = `https://pay.payos.vn/web/${existing.id}`;
      } else {
        throw payosError;
      }
    }

    this.logger.log(`[RETRY] Tạo lại link thanh toán cho booking #${booking.id} (${booking.bookingCode})`);

    return { checkoutUrl, expiresAt: expiryTime.toISOString() };
  }

  async getBookingById(bookingId: number) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true, // Lấy fullName từ bảng User
        tour: true, // Lấy name, startDate, imageUrl từ bảng Tour
      },
    });
  }

  async findByBookingCode(bookingCode: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: bookingCode },
      include: {
        tour: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Bọc trong object { data: ... } để khớp 100% với Frontend của em
    return { data: booking };
  }

  async proxyImage(imageUrl: string, res: Response) {
    try {
      // Gọi sang Unsplash để lấy ảnh dưới dạng luồng dữ liệu (Stream)
      const response = await firstValueFrom(
        this.httpService.get(imageUrl, {
          responseType: 'stream',
        }),
      );

      // Đặt thẻ tiêu đề cho phép CORS để Frontend chụp ảnh được
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', response.headers['content-type']); // Giữ nguyên định dạng ảnh (JPG, PNG...)
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache ảnh để tăng tốc

      // Stream dữ liệu ảnh về cho Frontend
      response.data.pipe(res);

    } catch (error) {
      this.logger.error('Lỗi khi proxy ảnh:', error.message);
      throw new NotFoundException('Failed to proxy image');
    }
  }

  // ============ CANCELLATION FLOW ============

  /**
   * Tính số tiền hoàn theo chính sách 3 tier:
   * >= 7 ngày trước khởi hành → hoàn 100%
   * 3-6 ngày → hoàn 50%
   * < 3 ngày hoặc đã qua → không hoàn
   * PENDING (chưa thanh toán) → hoàn 100% ngay
   */
  calculateRefund(booking: {
    paymentStatus: string;
    totalPrice: number;
    tour: { startDate: Date };
  }): { refundAmount: number; refundNote: string; policyTier: string } {
    if (booking.paymentStatus !== 'PAID') {
      return {
        refundAmount: Number(booking.totalPrice),
        refundNote: 'Hoàn 100% — chưa thanh toán',
        policyTier: 'FULL_UNPAID',
      };
    }

    const now = new Date();
    const tourStart = new Date(booking.tour.startDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilTour = Math.ceil((tourStart.getTime() - now.getTime()) / msPerDay);

    if (daysUntilTour >= 7) {
      return {
        refundAmount: Number(booking.totalPrice),
        refundNote: 'Hoàn 100% (hủy trước 7 ngày khởi hành)',
        policyTier: 'FULL_REFUND',
      };
    } else if (daysUntilTour >= 3) {
      return {
        refundAmount: Number(booking.totalPrice) * 0.5,
        refundNote: 'Hoàn 50% (hủy trong vòng 3-6 ngày trước khởi hành)',
        policyTier: 'HALF_REFUND',
      };
    } else {
      return {
        refundAmount: 0,
        refundNote: 'Không hoàn tiền (hủy dưới 3 ngày hoặc sau ngày khởi hành)',
        policyTier: 'NO_REFUND',
      };
    }
  }

  /**
   * Khách hàng gửi yêu cầu hủy booking.
   * - PENDING (chưa thanh toán): hủy ngay, không cần admin duyệt.
   * - CONFIRMED (đã thanh toán): chuyển sang CANCEL_REQUESTED, chờ admin.
   */
  async requestCancellation(bookingId: number, userId: number, reason: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.userId !== userId) throw new BadRequestException('Không có quyền hủy booking này');

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking này đã được hủy trước đó');
    }
    if (booking.status === 'CANCEL_REQUESTED') {
      throw new BadRequestException('Yêu cầu hủy của bạn đang chờ xử lý');
    }

    const { refundAmount, refundNote } = this.calculateRefund({
      paymentStatus: booking.paymentStatus,
      totalPrice: Number(booking.totalPrice),
      tour: booking.tour,
    });

    // PENDING = chưa thanh toán → hủy ngay, hoàn ghế
    if (booking.status === 'PENDING') {
      await this.prisma.$transaction([
        this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: 'CANCELLED',
            cancelReason: reason,
            cancelledAt: new Date(),
            cancelledBy: 'CUSTOMER',
            refundAmount: 0, // Chưa thanh toán → không có tiền để hoàn
            refundNote: 'Hủy trước khi thanh toán',
          },
        }),
        this.prisma.tour.update({
          where: { id: booking.tourId },
          data: { availableSeats: { increment: booking.numberOfPeople } },
        }),
      ]);

      this.logger.log(`[CANCEL] Khách hủy booking PENDING #${bookingId} trước khi thanh toán`);
      return { message: 'Đã hủy đặt tour thành công', refundAmount: 0, refundNote: 'Chưa thanh toán — không có hoàn tiền' };
    }

    // CONFIRMED = đã thanh toán → chuyển sang CANCEL_REQUESTED, chờ admin
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCEL_REQUESTED',
        cancelReason: reason,
        cancelRequestedAt: new Date(),
        refundAmount,
        refundNote,
      },
    });

    // Gửi email xác nhận cho khách
    try {
      if (booking.user?.email) {
        await this.mailService.sendCancelRequestConfirmation({
          to: booking.user.email,
          customerName: booking.user.fullName,
          bookingCode: booking.bookingCode,
          tourName: booking.tour.name,
          cancelReason: reason,
          refundAmount,
          refundNote,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Lỗi gửi email yêu cầu hủy:', emailError);
    }

    this.logger.log(`[CANCEL] Booking #${bookingId} chuyển sang CANCEL_REQUESTED. Dự kiến hoàn: ${refundAmount}đ`);
    return { message: 'Yêu cầu hủy đã được ghi nhận, đang chờ xử lý', refundAmount, refundNote };
  }

  /**
   * Admin duyệt yêu cầu hủy → CANCELLED + hoàn ghế
   */
  async approveCancellation(bookingId: number, adminNote?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.status !== 'CANCEL_REQUESTED') {
      throw new BadRequestException('Booking này không ở trạng thái chờ duyệt hủy');
    }

    const refundAmount = Number(booking.refundAmount ?? 0);

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          cancelledAt: new Date(),
          cancelledBy: 'ADMIN',
          refundNote: adminNote || booking.refundNote,
        },
      }),
      this.prisma.tour.update({
        where: { id: booking.tourId },
        data: { availableSeats: { increment: booking.numberOfPeople } },
      }),
    ]);

    // Ghi log PaymentTransaction REFUND nếu có hoàn tiền
    if (refundAmount > 0) {
      await this.prisma.paymentTransaction.create({
        data: {
          bookingId,
          gateway: 'MANUAL',
          amount: refundAmount,
          status: 'SUCCESS',
          transactionRef: `REFUND-${bookingId}-${Date.now()}`,
        },
      });
    }

    // Gửi email thông báo cho khách
    try {
      if (booking.user?.email) {
        await this.mailService.sendCancellationApproved({
          to: booking.user.email,
          customerName: booking.user.fullName,
          bookingCode: booking.bookingCode,
          tourName: booking.tour.name,
          refundAmount,
          adminNote,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Lỗi gửi email duyệt hủy:', emailError);
    }

    this.logger.log(`[ADMIN] Đã duyệt hủy booking #${bookingId}. Hoàn tiền: ${refundAmount}đ`);
    return { message: 'Đã duyệt hủy booking và hoàn trả ghế', refundAmount };
  }

  /**
   * Admin từ chối yêu cầu hủy → CONFIRMED trở lại
   */
  async rejectCancellation(bookingId: number, rejectReason: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: { user: true, tour: true },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.status !== 'CANCEL_REQUESTED') {
      throw new BadRequestException('Booking này không ở trạng thái chờ duyệt hủy');
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        cancelReason: null,
        cancelRequestedAt: null,
        refundAmount: null,
        refundNote: rejectReason,
      },
    });

    // Gửi email thông báo từ chối cho khách
    try {
      if (booking.user?.email) {
        await this.mailService.sendCancellationRejected({
          to: booking.user.email,
          customerName: booking.user.fullName,
          bookingCode: booking.bookingCode,
          tourName: booking.tour.name,
          rejectReason,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Lỗi gửi email từ chối hủy:', emailError);
    }

    this.logger.log(`[ADMIN] Đã từ chối hủy booking #${bookingId}. Lý do: ${rejectReason}`);
    return { message: 'Đã từ chối yêu cầu hủy, booking tiếp tục hiệu lực' };
  }

  /**
   * Admin lấy danh sách yêu cầu hủy đang chờ xử lý
   */
  async getCancelRequests() {
    const requests = await this.prisma.booking.findMany({
      where: { status: 'CANCEL_REQUESTED', deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        tour: { select: { id: true, name: true, imageUrl: true, tourCode: true, startDate: true } },
      },
      orderBy: { cancelRequestedAt: 'asc' }, // Xử lý theo thứ tự gửi
    });

    return requests.map(b => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      unitPriceAtBooking: Number(b.unitPriceAtBooking),
      discountAmount: Number(b.discountAmount),
      refundAmount: Number(b.refundAmount ?? 0),
    }));
  }

  /**
   * Quick stats for Staff Dashboard (no revenue, just booking counts).
   * Accessible by STAFF | ADMIN | SUPER_ADMIN.
   */
  async getAdminQuickStats() {
    const [grouped, myToursCount] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),
      this.prisma.tour.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
    ]);

    const map: Record<string, number> = {};
    for (const row of grouped) map[row.status] = row._count.status;

    return {
      pending: map['PENDING'] || 0,
      confirmed: map['CONFIRMED'] || 0,
      cancelRequested: map['CANCEL_REQUESTED'] || 0,
      cancelled: map['CANCELLED'] || 0,
      total: Object.values(map).reduce((a, b) => a + b, 0),
      publishedTours: myToursCount,
    };
  }

  findAll() {
    return `This action returns all booking`;
  }

  findOne(id: number) {
    return `This action returns a #${id} booking`;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}

