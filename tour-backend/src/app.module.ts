import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TourModule } from './tour/tour.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { SearchModule } from './search/search.module';

@Module({
  imports: [PrismaModule, AuthModule, TourModule, BookingModule, PaymentModule, MailModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SearchModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
