import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { randomUUID } from 'crypto';

type SubscriberStatusFilter = 'active' | 'inactive' | 'all';
type CampaignAudience = 'ALL_ACTIVE' | 'CURRENT_FILTER';
type MarketingCampaignStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';

export interface StoredMarketingCampaign {
  id: string;
  campaignName: string;
  type?: string;
  subject: string;
  previewText?: string;
  body: string;
  audience: CampaignAudience;
  audienceFilter?: { status?: SubscriberStatusFilter; search?: string };
  scheduledAt: string;
  status: MarketingCampaignStatus;
  recipientEstimate: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  errorMessage?: string;
}

const CAMPAIGN_STORE_KEY = 'marketing_campaign_queue';

@Injectable()
export class SubscriberService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // Public: đăng ký nhận tin
  async subscribe(email: string) {
    const existing = await this.prisma.subscriber.findUnique({ where: { email } });
    if (existing) {
      if (!existing.isActive) {
        const reactivated = await this.prisma.subscriber.update({
          where: { email },
          data: { isActive: true },
        });
        return { success: true, message: 'reactivated', data: reactivated };
      }
      return { success: true, message: 'already_exists', data: existing };
    }
    const newSubscriber = await this.prisma.subscriber.create({ data: { email } });
    return { success: true, message: 'created', data: newSubscriber };
  }

  // Admin/Staff: danh sách subscribers có phân trang
  async getAll(query: { page: number; limit: number; search?: string; status?: SubscriberStatusFilter }) {
    const { page, limit, search, status = 'all' } = query;
    const skip = (page - 1) * limit;
    const where = {
      ...(search ? { email: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(status === 'active' ? { isActive: true } : {}),
      ...(status === 'inactive' ? { isActive: false } : {}),
    };

    const [subscribers, total] = await Promise.all([
      this.prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.subscriber.count({ where }),
    ]);

    return {
      data: subscribers,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  // Admin/Staff: thống kê subscriber
  async getStats() {
    const [total, active, thisMonth] = await Promise.all([
      this.prisma.subscriber.count(),
      this.prisma.subscriber.count({ where: { isActive: true } }),
      this.prisma.subscriber.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);
    return { total, active, inactive: total - active, thisMonth };
  }

  // Admin: xóa subscriber
  async setActive(id: number, isActive: boolean) {
    return this.prisma.subscriber.update({
      where: { id },
      data: { isActive },
    });
  }

  async sendCampaignTest(data: {
    to: string;
    subject: string;
    previewText?: string;
    body: string;
    campaignName?: string;
  }) {
    await this.mailService.sendMarketingCampaignTest(data);
    return { success: true, message: 'test_sent', data: { to: data.to } };
  }

  private async getCampaignStore(): Promise<StoredMarketingCampaign[]> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: CAMPAIGN_STORE_KEY } });
    if (!setting?.value) return [];
    try {
      const parsed = JSON.parse(setting.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async saveCampaignStore(campaigns: StoredMarketingCampaign[]) {
    await this.prisma.systemSetting.upsert({
      where: { key: CAMPAIGN_STORE_KEY },
      create: {
        key: CAMPAIGN_STORE_KEY,
        value: JSON.stringify(campaigns),
        label: 'Marketing campaign queue',
        description: 'Scheduled newsletter and promotion campaigns',
        group: 'marketing',
      },
      update: { value: JSON.stringify(campaigns) },
    });
  }

  private getAudienceWhere(campaign: Pick<StoredMarketingCampaign, 'audience' | 'audienceFilter'>) {
    const search = campaign.audience === 'CURRENT_FILTER'
      ? campaign.audienceFilter?.search?.trim()
      : '';
    return {
      isActive: true,
      ...(search ? { email: { contains: search, mode: 'insensitive' as const } } : {}),
    };
  }

  async getCampaigns() {
    const campaigns = await this.getCampaignStore();
    return campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async scheduleCampaign(data: {
    campaignName: string;
    type?: string;
    subject: string;
    previewText?: string;
    body: string;
    audience: CampaignAudience;
    audienceFilter?: { status?: SubscriberStatusFilter; search?: string };
    scheduledAt: string;
  }) {
    const scheduledDate = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      throw new Error('Invalid scheduledAt');
    }

    const now = new Date().toISOString();
    const recipientEstimate = data.audience === 'CURRENT_FILTER' && data.audienceFilter?.status === 'inactive'
      ? 0
      : await this.prisma.subscriber.count({ where: this.getAudienceWhere(data) });

    const campaign: StoredMarketingCampaign = {
      id: randomUUID(),
      campaignName: data.campaignName,
      type: data.type,
      subject: data.subject,
      previewText: data.previewText,
      body: data.body,
      audience: data.audience,
      audienceFilter: data.audienceFilter,
      scheduledAt: scheduledDate.toISOString(),
      status: 'SCHEDULED',
      recipientEstimate,
      sentCount: 0,
      failedCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const campaigns = await this.getCampaignStore();
    campaigns.unshift(campaign);
    await this.saveCampaignStore(campaigns);
    return campaign;
  }

  async processDueCampaigns() {
    const campaigns = await this.getCampaignStore();
    const now = Date.now();
    let changed = false;

    for (const campaign of campaigns) {
      if (campaign.status !== 'SCHEDULED') continue;
      if (new Date(campaign.scheduledAt).getTime() > now) continue;

      campaign.status = 'SENDING';
      campaign.updatedAt = new Date().toISOString();
      changed = true;
      await this.saveCampaignStore(campaigns);

      try {
        const recipients = campaign.audience === 'CURRENT_FILTER' && campaign.audienceFilter?.status === 'inactive'
          ? []
          : await this.prisma.subscriber.findMany({
              where: this.getAudienceWhere(campaign),
              select: { email: true },
              take: 500,
            });

        let sentCount = 0;
        let failedCount = 0;
        for (const recipient of recipients) {
          try {
            await this.mailService.sendMarketingCampaignEmail({
              to: recipient.email,
              campaignName: campaign.campaignName,
              subject: campaign.subject,
              previewText: campaign.previewText,
              body: campaign.body,
            });
            sentCount += 1;
          } catch {
            failedCount += 1;
          }
        }

        campaign.status = failedCount > 0 && sentCount === 0 ? 'FAILED' : 'SENT';
        campaign.sentCount = sentCount;
        campaign.failedCount = failedCount;
        campaign.sentAt = new Date().toISOString();
        campaign.updatedAt = campaign.sentAt;
        changed = true;
      } catch (error) {
        campaign.status = 'FAILED';
        campaign.errorMessage = error instanceof Error ? error.message : 'Unknown campaign send error';
        campaign.updatedAt = new Date().toISOString();
        changed = true;
      }
    }

    if (changed) await this.saveCampaignStore(campaigns);
  }

  async remove(id: number) {
    return this.prisma.subscriber.delete({ where: { id } });
  }
}
