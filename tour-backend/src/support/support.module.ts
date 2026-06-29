import { Module } from '@nestjs/common';
import { SupportController, SupportCustomerController } from './support.controller';
import { SupportService } from './support.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, MailModule, AiModule],
  controllers: [SupportController, SupportCustomerController],
  providers: [SupportService],
  exports: [SupportService], // export để ContactModule inject vào
})
export class SupportModule {}
