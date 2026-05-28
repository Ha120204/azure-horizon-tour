import { Test, TestingModule } from '@nestjs/testing';
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

describe('BookingService', () => {
  let service: BookingService;

  beforeEach(async () => {
    const mockValue = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: mockValue },
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
});
