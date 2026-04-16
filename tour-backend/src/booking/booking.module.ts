import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PaymentModule } from '../payment/payment.module';
import { HttpModule } from '@nestjs/axios';
import { VoucherModule } from '../voucher/voucher.module';
import { MailModule } from '../mail/mail.module';
import { BookingCronService } from './booking-cron.service';

@Module({
  imports: [PaymentModule, HttpModule, VoucherModule, MailModule],
  controllers: [BookingController],
  providers: [BookingService, BookingCronService],
  exports: [BookingService],
})
export class BookingModule {}

