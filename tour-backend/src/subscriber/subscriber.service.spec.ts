import { Test, TestingModule } from '@nestjs/testing';
import { SubscriberService } from './subscriber.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

type Campaign = Record<string, any>;

// So khớp where tối giản đủ cho các truy vấn của service trên MarketingCampaign
const matchesWhere = (c: Campaign, where: Record<string, any> = {}): boolean => {
  if (where.id !== undefined && c.id !== where.id) return false;
  if (where.status !== undefined) {
    if (typeof where.status === 'string' && c.status !== where.status) return false;
    if (where.status.in && !where.status.in.includes(c.status)) return false;
  }
  if (where.scheduledAt?.lte) {
    if (!c.scheduledAt || new Date(c.scheduledAt) > where.scheduledAt.lte) return false;
  }
  if (where.OR) {
    const ok = where.OR.some((cond: Record<string, any>) => {
      if ('lockedAt' in cond) {
        if (cond.lockedAt === null) return c.lockedAt == null;
        if (cond.lockedAt?.lt) return c.lockedAt != null && new Date(c.lockedAt) < cond.lockedAt.lt;
      }
      return false;
    });
    if (!ok) return false;
  }
  return true;
};

describe('SubscriberService', () => {
  let service: SubscriberService;
  let campaigns: Campaign[];

  const prisma = {
    marketingCampaign: {
      findMany: jest.fn(({ where = {} } = {}) =>
        Promise.resolve(campaigns.filter((c) => matchesWhere(c, where)).map((c) => ({ ...c })))),
      findUnique: jest.fn(({ where: { id } }) => {
        const found = campaigns.find((c) => c.id === id);
        return Promise.resolve(found ? { ...found } : null);
      }),
      updateMany: jest.fn(({ where = {}, data }) => {
        let count = 0;
        campaigns = campaigns.map((c) => {
          if (matchesWhere(c, where)) {
            count += 1;
            return { ...c, ...data };
          }
          return c;
        });
        return Promise.resolve({ count });
      }),
      update: jest.fn(({ where: { id }, data }) => {
        let updated: Campaign | null = null;
        campaigns = campaigns.map((c) => {
          if (c.id === id) {
            const next = { ...c, ...data };
            updated = next;
            return next;
          }
          return c;
        });
        return Promise.resolve(updated);
      }),
      create: jest.fn(({ data }) => {
        const created = { id: data.id ?? `campaign-${campaigns.length + 1}`, ...data };
        campaigns.push(created);
        return Promise.resolve({ ...created });
      }),
      deleteMany: jest.fn(({ where = {} }) => {
        const before = campaigns.length;
        campaigns = campaigns.filter((c) => !matchesWhere(c, where));
        return Promise.resolve({ count: before - campaigns.length });
      }),
    },
    subscriber: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mailService = {
    sendMarketingCampaignEmail: jest.fn(),
  };

  beforeEach(async () => {
    campaigns = [];
    jest.clearAllMocks();
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
    campaigns = [{
      id: 'campaign-1',
      campaignName: 'Summer',
      subject: 'Summer deals',
      body: 'Book now',
      audience: 'ALL_ACTIVE',
      audienceFilter: null,
      recipientIds: [],
      scheduledAt: new Date(Date.now() - 60_000),
      status: 'SCHEDULED',
      recipientEstimate: 101,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      lastProcessedRecipientId: null,
      lockedAt: null,
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
    expect(campaigns[0]).toMatchObject({
      status: 'SENDING',
      processedCount: 100,
      sentCount: 100,
      failedCount: 0,
      lastProcessedRecipientId: 100,
      lockedAt: null,
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
    expect(campaigns[0]).toMatchObject({
      status: 'SENT',
      processedCount: 101,
      sentCount: 101,
      failedCount: 0,
      lastProcessedRecipientId: 101,
    });
  });

  it('counts failed recipients while continuing the current batch', async () => {
    campaigns = [{
      id: 'campaign-2',
      campaignName: 'Newsletter',
      subject: 'News',
      body: 'Latest news',
      audience: 'ALL_ACTIVE',
      audienceFilter: null,
      recipientIds: [],
      scheduledAt: new Date(Date.now() - 60_000),
      status: 'SCHEDULED',
      recipientEstimate: 2,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      lastProcessedRecipientId: null,
      lockedAt: null,
    }];
    prisma.subscriber.findMany.mockResolvedValue([
      { id: 1, email: 'success@example.com', unsubscribeToken: 'token-1' },
      { id: 2, email: 'failed@example.com', unsubscribeToken: 'token-2' },
    ]);
    mailService.sendMarketingCampaignEmail
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Mail provider error'));

    await service.processDueCampaigns();

    expect(campaigns[0]).toMatchObject({
      status: 'SENT',
      processedCount: 2,
      sentCount: 1,
      failedCount: 1,
      lastProcessedRecipientId: 2,
    });
  });

  it('skips a campaign already locked by another worker', async () => {
    campaigns = [{
      id: 'campaign-locked',
      campaignName: 'Locked',
      subject: 'News',
      body: 'Latest news',
      audience: 'ALL_ACTIVE',
      audienceFilter: null,
      recipientIds: [],
      scheduledAt: new Date(Date.now() - 60_000),
      status: 'SENDING',
      recipientEstimate: 5,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      lastProcessedRecipientId: null,
      lockedAt: new Date(), // đang bị worker khác giữ trong TTL
    }];

    await service.processDueCampaigns();

    expect(mailService.sendMarketingCampaignEmail).not.toHaveBeenCalled();
    expect(campaigns[0].status).toBe('SENDING');
  });

  it('creates a draft with a server-computed recipient estimate', async () => {
    prisma.subscriber.count.mockResolvedValue(5);

    const draft = await service.createDraft({
      campaignName: 'Khuyến mãi hè',
      subject: 'Ưu đãi',
      body: 'Nội dung',
      audience: 'ALL_ACTIVE',
    } as any, 7);

    expect(draft).toMatchObject({ status: 'DRAFT', recipientEstimate: 5, createdBy: 7 });
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].status).toBe('DRAFT');
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
    campaigns = [{
      id: 'campaign-scheduled',
      campaignName: 'Scheduled newsletter',
      subject: 'News',
      body: 'Latest news',
      audience: 'ALL_ACTIVE',
      audienceFilter: null,
      recipientIds: [],
      scheduledAt: new Date(Date.now() + 60_000),
      status: 'SCHEDULED',
      recipientEstimate: 10,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      lastProcessedRecipientId: null,
      lockedAt: null,
    }];

    await expect(service.cancelCampaign('campaign-scheduled')).resolves.toMatchObject({
      id: 'campaign-scheduled',
      status: 'CANCELLED',
      cancelledAt: expect.any(Date),
    });
    expect(campaigns[0]).toMatchObject({
      id: 'campaign-scheduled',
      status: 'CANCELLED',
      campaignName: 'Scheduled newsletter',
    });
  });

  it('rejects cancellation after a campaign starts sending', async () => {
    campaigns = [{
      id: 'campaign-sending',
      campaignName: 'Sending newsletter',
      subject: 'News',
      body: 'Latest news',
      audience: 'ALL_ACTIVE',
      audienceFilter: null,
      recipientIds: [],
      scheduledAt: new Date(),
      status: 'SENDING',
      recipientEstimate: 10,
      processedCount: 1,
      sentCount: 1,
      failedCount: 0,
      lastProcessedRecipientId: null,
      lockedAt: null,
    }];

    await expect(service.cancelCampaign('campaign-sending')).rejects.toThrow(
      'Chỉ có thể hủy chiến dịch chưa bắt đầu gửi',
    );
  });
});
