import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { VoucherService } from '../voucher/voucher.service';
import { MailService } from '../mail/mail.service';
import { AssistedDraftService } from './assisted-draft.service';
import { BookingCancellationService } from './booking-cancellation.service';
import { BookingQueryService } from './booking-query.service';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';
import { CreateBookingDto } from './dto/create-booking.dto';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: { $transaction: jest.Mock };
  let paymentService: { createPaymentLink: jest.Mock; getPaymentInfo: jest.Mock };

  beforeEach(async () => {
    const mockValue = {};
    prisma = { $transaction: jest.fn() };
    paymentService = {
      createPaymentLink: jest.fn(),
      getPaymentInfo: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentService, useValue: paymentService },
        { provide: ConfigService, useValue: mockValue },
        { provide: HttpService, useValue: mockValue },
        { provide: VoucherService, useValue: mockValue },
        { provide: MailService, useValue: mockValue },
        { provide: AssistedDraftService, useValue: mockValue },
        { provide: BookingCancellationService, useValue: mockValue },
        { provide: BookingQueryService, useValue: mockValue },
        { provide: AdminNotificationService, useValue: mockValue },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects booking creation when user is not authenticated', async () => {
    const dto = { tourId: 1, numberOfPeople: 1 } as CreateBookingDto;

    await expect(service.create(null, dto, '127.0.0.1')).rejects.toThrow(UnauthorizedException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rolls back the held booking when PayOS link creation fails', async () => {
    const createdBooking = {
      id: 5,
      bookingCode: 'AH-TEST-5',
      totalPrice: 1_000_000,
      paymentMethod: 'PAYOS',
      passengers: [{ type: 'ADULT' }, { type: 'ADULT' }],
      numberOfPeople: 2,
      tourId: 10,
      departureId: 20,
      voucherCode: null,
      userId: 7,
    };
    // 1st $transaction → tạo booking (giữ ghế); 2nd → rollback trong cancelAndRestoreSeats
    prisma.$transaction
      .mockResolvedValueOnce(createdBooking)
      .mockResolvedValueOnce(undefined);
    paymentService.createPaymentLink.mockRejectedValue(new Error('PayOS unavailable'));

    const dto = { tourId: 10, numberOfPeople: 2, packageId: 1 } as CreateBookingDto;

    await expect(service.create(7, dto, '127.0.0.1')).rejects.toThrow(BadRequestException);
    expect(paymentService.createPaymentLink).toHaveBeenCalledTimes(1);
    // Lần $transaction thứ 2 chính là bước hoàn ghế — bằng chứng booking không bị treo
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
