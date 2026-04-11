import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PaymentModule } from '../payment/payment.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PaymentModule, HttpModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
