import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MAIL_USER') return 'test@example.com';
              if (key === 'MAIL_PASS') return 'test-password';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('adds an unsubscribe link and header to marketing emails', async () => {
    const sendMail = jest.spyOn(service, 'sendMail').mockResolvedValue({});

    await service.sendMarketingCampaignEmail({
      to: 'traveler@example.com',
      subject: 'Summer',
      body: 'Book now',
      unsubscribeToken: 'unsubscribe-token',
    });

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      headers: {
        'List-Unsubscribe': '<http://localhost:3001/vi/unsubscribe?token=unsubscribe-token>',
      },
      html: expect.stringContaining('unsubscribe-token'),
    }));
  });
});
