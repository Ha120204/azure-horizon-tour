import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PaymentModule } from '../payment/payment.module';
import { HttpModule } from '@nestjs/axios';
import { VoucherModule } from '../voucher/voucher.module';
import { MailModule } from '../mail/mail.module';
import { BookingCronService } from './booking-cron.service';
import { AssistedDraftService } from './assisted-draft.service';
import { BookingCancellationService } from './booking-cancellation.service';
import { BookingQueryService } from './booking-query.service';
import { BookingPaymentService } from './booking-payment.service';

@Module({
  imports: [PaymentModule, HttpModule, VoucherModule, MailModule],
  controllers: [BookingController],
  providers: [BookingService, BookingCronService, AssistedDraftService, BookingCancellationService, BookingQueryService, BookingPaymentService],
  exports: [BookingService, AssistedDraftService, BookingCancellationService, BookingQueryService, BookingPaymentService],
})
export class BookingModule {}
