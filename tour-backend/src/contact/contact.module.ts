import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MailModule } from '../mail/mail.module';
import { SupportModule } from '../support/support.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [MailModule, SupportModule, SettingsModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
