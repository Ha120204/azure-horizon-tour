import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
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

  beforeEach(async () => {
    const mockValue = {};
    prisma = { $transaction: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentService, useValue: mockValue },
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
});
