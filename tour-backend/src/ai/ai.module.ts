import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiTranslationService } from './ai-translation.service';
import { AiController } from './ai.controller';
import { JwtModule } from '@nestjs/jwt';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [
    BookingModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'azure_horizon_secret_k3y_2026',
    }),
  ],
  controllers: [AiController],
  providers: [AiService, AiTranslationService],
  exports: [AiService, AiTranslationService],
})
export class AiModule {}
