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

      if (tour.availableSeats < dto.numberOfPeople) {
        throw new BadRequestException('Not enough seats available');
      }

      let totalPrice = tour.price * dto.numberOfPeople;
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

      // 3. Trừ ghế bằng Atomic Decrement (an toàn khi nhiều người đặt cùng lúc)
      await tx.tour.update({
        where: { id: tour.id },
        data: { availableSeats: { decrement: dto.numberOfPeople } },
      });

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
          unitPriceAtBooking: tour.price, // [PHASE 1] Đóng băng giá vé tại thời điểm đặt
          voucherCode,
          discountAmount,
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
    // Quy đổi USD → VNĐ từ biến môi trường (đồng bộ với Frontend)
    const exchangeRate = this.configService.get<number>('USD_TO_VND_RATE', 26335);
    const amountVND = Math.round(booking.totalPrice * exchangeRate);

    // Mô tả hiển thị trên mã QR ngân hàng (tối đa 25 ký tự)
    const description = `AH ${booking.bookingCode}`;

    // Dùng booking.id (số nguyên tự tăng) làm orderCode cho PayOS
    const checkoutUrl = await this.paymentService.createPaymentLink(
      booking.id,
      amountVND,
      description,
    );

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

  async getMyBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId, deletedAt: null }, // [PHASE 1] Filter soft delete
      include: { tour: true },
      orderBy: { createdAt: 'desc' },
    });
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

