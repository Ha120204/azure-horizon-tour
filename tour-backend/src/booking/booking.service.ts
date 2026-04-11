import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PaymentService } from '../payment/payment.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly httpService: HttpService,
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
    const tour = await this.prisma.tour.findUnique({
      where: { id: dto.tourId },
    });

    if (!tour) {
      throw new NotFoundException('Không tìm thấy tour');
    }

    if (tour.availableSeats < dto.numberOfPeople) {
      throw new BadRequestException('Không đủ chỗ trống');
    }

    const totalPrice = tour.price * dto.numberOfPeople;

    await this.prisma.tour.update({
      where: { id: tour.id },
      data: { availableSeats: tour.availableSeats - dto.numberOfPeople },
    });

    // 👇 BƯỚC MỚI: TẠO MÃ BOOKING CHUYÊN NGHIỆP 👇
    const newBookingCode = this.generateBookingCode();

    const booking = await this.prisma.booking.create({
      data: {
        bookingCode: newBookingCode, // BƠM VÀO DATABASE Ở ĐÂY
        userId,
        tourId: dto.tourId,
        numberOfPeople: dto.numberOfPeople,
        totalPrice,
      },
    });

    // Code mới: Truyền hẳn bookingCode (chuỗi) sang VNPAY
    const paymentUrl = this.paymentService.createPaymentUrl(booking.bookingCode, booking.totalPrice, ip);

    return { message: 'Đặt tour thành công, vui lòng thanh toán', booking, paymentUrl };
  }

  async updatePaymentStatus(txnRef: string, responseCode: string, vnpayTxnNo: string) {
    // 1. Tách lấy bookingCode (Để nguyên dạng chuỗi, KHÔNG ép sang Number nữa)
    const bookingCode = txnRef.split('_')[0];

    // 2. Tìm đơn hàng theo bookingCode thay vì id
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: bookingCode }, // TÌM BẰNG CODE
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt tour');
    }

    // 3. Cập nhật trạng thái dựa vào mã phản hồi VNPAY
    if (responseCode === '00') {
      await this.prisma.booking.update({
        where: { bookingCode: bookingCode }, // CẬP NHẬT BẰNG CODE
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          vnpayTxnRef: vnpayTxnNo,
        },
      });
    } else {
      await this.prisma.booking.update({
        where: { bookingCode: bookingCode }, // CẬP NHẬT BẰNG CODE
        data: {
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
        },
      });
    }
  }
  async getMyBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
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
      throw new NotFoundException('Không tìm thấy đơn hàng này');
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
      console.error('Lỗi khi proxy ảnh:', error.message);
      throw new NotFoundException('Không thể tải ảnh từ nguồn gốc');
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
