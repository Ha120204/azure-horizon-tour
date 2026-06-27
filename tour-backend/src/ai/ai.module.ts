import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiToolService } from './ai-tool.service';
import { AiTranslationService } from './ai-translation.service';
import { AiEmbeddingService } from './ai-embedding.service';
import { AiController } from './ai.controller';
import { JwtModule } from '@nestjs/jwt';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [
    BookingModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [AiController],
  providers: [AiService, AiToolService, AiTranslationService, AiEmbeddingService],
  exports: [AiService, AiTranslationService, AiEmbeddingService],
})
export class AiModule {}
