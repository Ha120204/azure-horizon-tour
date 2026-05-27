import { Test, TestingModule } from '@nestjs/testing';
import { SubscriberService } from './subscriber.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('SubscriberService', () => {
  let service: SubscriberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriberService,
        { provide: PrismaService, useValue: {} },
        { provide: MailService, useValue: {} },
      ],
    }).compile();

    service = module.get<SubscriberService>(SubscriberService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
