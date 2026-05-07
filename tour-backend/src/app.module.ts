import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// ── Infrastructure ────────────────────────────────────────────────────────────
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';

// ── Auth & Users ──────────────────────────────────────────────────────────────
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

// ── Core Business Domain ──────────────────────────────────────────────────────
import { TourModule } from './tour/tour.module';
import { TourPackageModule } from './tour-package/tour-package.module';
import { TourDepartureModule } from './tour-departure/tour-departure.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { VoucherModule } from './voucher/voucher.module';

// ── Content & Features ────────────────────────────────────────────────────────
import { ArticleModule } from './article/article.module';
import { ReviewModule } from './review/review.module';
import { SearchModule } from './search/search.module';
import { AiModule } from './ai/ai.module';
import { SubscriberModule } from './subscriber/subscriber.module';
import { ContactModule } from './contact/contact.module';
import { SupportModule } from './support/support.module';

// ── Admin & Operations ────────────────────────────────────────────────────────
import { StatisticsModule } from './statistics/statistics.module';
import { SettingsModule } from './settings/settings.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    // Global config & scheduling
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Infrastructure
    PrismaModule,
    MailModule,

    // Auth & Users
    AuthModule,
    UserModule,

    // Core Business Domain
    TourModule,
    TourPackageModule,
    TourDepartureModule,
    BookingModule,
    PaymentModule,
    VoucherModule,

    // Content & Features
    ArticleModule,
    ReviewModule,
    SearchModule,
    AiModule,
    SubscriberModule,
    ContactModule,
    SupportModule,

    // Admin & Operations
    StatisticsModule,
    SettingsModule,
    ActivityLogModule,
  ],

  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
