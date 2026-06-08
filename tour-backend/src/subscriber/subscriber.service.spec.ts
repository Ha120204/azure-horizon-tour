import { Test, TestingModule } from '@nestjs/testing';
import { SubscriberService } from './subscriber.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('SubscriberService', () => {
  let service: SubscriberService;
  let storedCampaigns: unknown[];
  const prisma = {
    systemSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    subscriber: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const mailService = {
    sendMarketingCampaignEmail: jest.fn(),
  };

  beforeEach(async () => {
    storedCampaigns = [];
    jest.clearAllMocks();
    prisma.systemSetting.findUnique.mockImplementation(() => Promise.resolve({
      value: JSON.stringify(storedCampaigns),
    }));
    prisma.systemSetting.upsert.mockImplementation(({ create, update }) => {
      storedCampaigns = JSON.parse(update?.value ?? create.value);
      return Promise.resolve({});
    });
    mailService.sendMarketingCampaignEmail.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriberService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<SubscriberService>(SubscriberService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sends due campaigns in batches and resumes from the last processed subscriber', async () => {
    const now = new Date().toISOString();
    storedCampaigns = [{
      id: 'campaign-1',
      campaignName: 'Summer',
      subject: 'Summer deals',
      body: 'Book now',
      audience: 'ALL_ACTIVE',
      scheduledAt: new Date(Date.now() - 60_000).toISOString(),
      status: 'SCHEDULED',
      recipientEstimate: 101,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      createdAt: now,
      updatedAt: now,
    }];
    const recipients = Array.from({ length: 101 }, (_, index) => ({
      id: index + 1,
      email: `subscriber-${index + 1}@example.com`,
      unsubscribeToken: `token-${index + 1}`,
    }));
    prisma.subscriber.findMany
      .mockResolvedValueOnce(recipients)
      .mockResolvedValueOnce([recipients[100]]);

    await service.processDueCampaigns();

    expect(mailService.sendMarketingCampaignEmail).toHaveBeenCalledTimes(100);
    expect(prisma.subscriber.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      orderBy: { id: 'asc' },
      take: 101,
    }));
    expect(storedCampaigns[0]).toMatchObject({
      status: 'SENDING',
      processedCount: 100,
      sentCount: 100,
      failedCount: 0,
      lastProcessedRecipientId: 100,
    });

    await service.processDueCampaigns();

    expect(mailService.sendMarketingCampaignEmail).toHaveBeenCalledTimes(101);
    expect(prisma.subscriber.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: {
        AND: [
          { isActive: true },
          { id: { gt: 100 } },
        ],
      },
    }));
    expect(storedCampaigns[0]).toMatchObject({
      status: 'SENT',
      processedCount: 101,
      sentCount: 101,
      failedCount: 0,
      lastProcessedRecipientId: 101,
    });
  });

  it('counts failed recipients while continuing the current batch', async () => {
    const now = new Date().toISOString();
    storedCampaigns = [{
      id: 'campaign-2',
      campaignName: 'Newsletter',
      subject: 'News',
      body: 'Latest news',
      audience: 'ALL_ACTIVE',
      scheduledAt: new Date(Date.now() - 60_000).toISOString(),
      status: 'SCHEDULED',
      recipientEstimate: 2,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      createdAt: now,
      updatedAt: now,
    }];
    prisma.subscriber.findMany.mockResolvedValue([
      { id: 1, email: 'success@example.com', unsubscribeToken: 'token-1' },
      { id: 2, email: 'failed@example.com', unsubscribeToken: 'token-2' },
    ]);
    mailService.sendMarketingCampaignEmail
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Mail provider error'));

    await service.processDueCampaigns();

    expect(storedCampaigns[0]).toMatchObject({
      status: 'SENT',
      processedCount: 2,
      sentCount: 1,
      failedCount: 1,
      lastProcessedRecipientId: 2,
    });
  });

  it('returns masked unsubscribe details without changing subscriber status', async () => {
    prisma.subscriber.findUnique.mockResolvedValue({
      email: 'traveler@example.com',
      isActive: true,
    });

    await expect(service.getUnsubscribeDetails('valid-token')).resolves.toEqual({
      email: 'tr******@example.com',
      isActive: true,
    });
    expect(prisma.subscriber.update).not.toHaveBeenCalled();
  });

  it('unsubscribes an active subscriber and records consent details', async () => {
    prisma.subscriber.findUnique.mockResolvedValue({
      id: 12,
      email: 'traveler@example.com',
      isActive: true,
    });
    prisma.subscriber.update.mockResolvedValue({});

    await expect(service.unsubscribe('valid-token', 'No longer interested')).resolves.toMatchObject({
      success: true,
      message: 'unsubscribed',
    });
    expect(prisma.subscriber.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        isActive: false,
        unsubscribedAt: expect.any(Date),
        unsubscribeReason: 'No longer interested',
      },
    });
  });

  it('keeps repeated unsubscribe requests idempotent', async () => {
    prisma.subscriber.findUnique.mockResolvedValue({
      id: 12,
      email: 'traveler@example.com',
      isActive: false,
    });

    await expect(service.unsubscribe('valid-token')).resolves.toMatchObject({
      success: true,
      message: 'already_unsubscribed',
    });
    expect(prisma.subscriber.update).not.toHaveBeenCalled();
  });

  it('cancels a scheduled campaign while preserving its history', async () => {
    const now = new Date().toISOString();
    storedCampaigns = [{
      id: 'campaign-scheduled',
      campaignName: 'Scheduled newsletter',
      subject: 'News',
      body: 'Latest news',
      audience: 'ALL_ACTIVE',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      status: 'SCHEDULED',
      recipientEstimate: 10,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      createdAt: now,
      updatedAt: now,
    }];

    await expect(service.cancelCampaign('campaign-scheduled')).resolves.toMatchObject({
      id: 'campaign-scheduled',
      status: 'CANCELLED',
      cancelledAt: expect.any(String),
    });
    expect(storedCampaigns[0]).toMatchObject({
      id: 'campaign-scheduled',
      status: 'CANCELLED',
      campaignName: 'Scheduled newsletter',
      cancelledAt: expect.any(String),
    });
  });

  it('rejects cancellation after a campaign starts sending', async () => {
    const now = new Date().toISOString();
    storedCampaigns = [{
      id: 'campaign-sending',
      campaignName: 'Sending newsletter',
      subject: 'News',
      body: 'Latest news',
      audience: 'ALL_ACTIVE',
      scheduledAt: now,
      status: 'SENDING',
      recipientEstimate: 10,
      processedCount: 1,
      sentCount: 1,
      failedCount: 0,
      createdAt: now,
      updatedAt: now,
    }];

    await expect(service.cancelCampaign('campaign-sending')).rejects.toThrow(
      'Chỉ có thể hủy chiến dịch chưa bắt đầu gửi',
    );
  });
});
