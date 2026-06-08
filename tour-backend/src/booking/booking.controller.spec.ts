import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PaymentService } from '../payment/payment.service';
import { ConfigService } from '@nestjs/config';
import { BookingPaymentService } from './booking-payment.service';
import { BookingTransportService } from './booking-transport.service';

describe('BookingController', () => {
  let controller: BookingController;

  beforeEach(async () => {
    const mockValue = {};
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        { provide: BookingService, useValue: mockValue },
        { provide: PaymentService, useValue: mockValue },
        { provide: ConfigService, useValue: mockValue },
        { provide: BookingPaymentService, useValue: mockValue },
        { provide: BookingTransportService, useValue: mockValue },
      ],
    }).compile();

    controller = module.get<BookingController>(BookingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
