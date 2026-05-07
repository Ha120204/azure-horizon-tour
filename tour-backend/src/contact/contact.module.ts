import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MailModule } from '../mail/mail.module';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [MailModule, SupportModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
