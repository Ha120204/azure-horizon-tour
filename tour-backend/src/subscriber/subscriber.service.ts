import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { CreateCampaignDto } from './dto/create-campaign.dto';
import type { UpdateCampaignDto } from './dto/update-campaign.dto';

type SubscriberStatusFilter = 'active' | 'inactive' | 'all';

const CAMPAIGN_BATCH_SIZE = 100;
// Khóa phân tán: chiến dịch bị giữ quá TTL coi như worker chết → cho phép giành lại
const CAMPAIGN_LOCK_TTL_MS = 5 * 60_000;
const ACTIVE_CAMPAIGN_STATUSES = ['SCHEDULED', 'SENDING'];

// Nội dung dùng để tính đối tượng nhận (audience) — không phụ thuộc Prisma type
interface CampaignAudienceData {
  audience: string;
  audienceFilter?: { status?: SubscriberStatusFilter; search?: string } | null;
  recipientIds?: number[];
}

@Injectable()
export class SubscriberService {
  private isProcessingCampaigns = false;

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // Public: đăng ký nhận tin
  async subscribe(email: string) {
    const existing = await this.prisma.subscriber.findUnique({ where: { email } });
    if (existing) {
      if (!existing.isActive) {
        await this.prisma.subscriber.update({
          where: { email },
          data: {
            isActive: true,
            unsubscribedAt: null,
            unsubscribeReason: null,
          },
        });
        return { success: true, message: 'reactivated' };
      }
      return { success: true, message: 'already_exists' };
    }
    await this.prisma.subscriber.create({ data: { email } });
    return { success: true, message: 'created' };
  }

  // Admin/Super Admin: danh sách subscribers có phân trang
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

  // Admin/Super Admin: thống kê subscriber
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

  // Admin: bật/tắt nhận tin
  async setActive(id: number, isActive: boolean) {
    return this.prisma.subscriber.update({
      where: { id },
      data: { isActive },
    });
  }

  async getUnsubscribeDetails(token: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
      select: { email: true, isActive: true },
    });
    if (!subscriber) throw new NotFoundException('Liên kết hủy đăng ký không hợp lệ');
    return {
      email: this.maskEmail(subscriber.email),
      isActive: subscriber.isActive,
    };
  }

  async unsubscribe(token: string, reason?: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true, email: true, isActive: true },
    });
    if (!subscriber) throw new NotFoundException('Liên kết hủy đăng ký không hợp lệ');
    if (!subscriber.isActive) {
      return { success: true, message: 'already_unsubscribed', data: { email: this.maskEmail(subscriber.email) } };
    }

    await this.prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason?.trim().slice(0, 500) || 'EMAIL_LINK',
      },
    });
    return { success: true, message: 'unsubscribed', data: { email: this.maskEmail(subscriber.email) } };
  }

  private maskEmail(email: string) {
    const [localPart, domain] = email.split('@');
    const visible = localPart.slice(0, Math.min(2, localPart.length));
    return `${visible}${'*'.repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
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

  // ── Đối tượng nhận ──────────────────────────────────────────────────────
  private normalizeRecipientIds(ids?: number[]) {
    return Array.from(new Set(
      (ids ?? [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ));
  }

  private getAudienceWhere(campaign: CampaignAudienceData): Prisma.SubscriberWhereInput {
    if (campaign.audience === 'MANUAL_SELECTION') {
      const ids = this.normalizeRecipientIds(campaign.recipientIds);
      return {
        isActive: true,
        id: { in: ids.length > 0 ? ids : [-1] },
      };
    }
    const search = campaign.audience === 'CURRENT_FILTER'
      ? campaign.audienceFilter?.search?.trim()
      : '';
    return {
      isActive: true,
      ...(search ? { email: { contains: search, mode: 'insensitive' as const } } : {}),
    };
  }

  private async computeRecipientEstimate(campaign: CampaignAudienceData) {
    if (campaign.audience === 'CURRENT_FILTER' && campaign.audienceFilter?.status === 'inactive') {
      return 0;
    }
    return this.prisma.subscriber.count({ where: this.getAudienceWhere(campaign) });
  }

  // Chuẩn hóa audience/recipientIds/audienceFilter để ghi xuống DB
  private buildAudiencePayload(dto: { audience: string; audienceFilter?: { status?: SubscriberStatusFilter; search?: string }; recipientIds?: number[] }) {
    const recipientIds = dto.audience === 'MANUAL_SELECTION'
      ? this.normalizeRecipientIds(dto.recipientIds)
      : [];
    const audienceFilter: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      dto.audience === 'CURRENT_FILTER' && dto.audienceFilter
        ? { status: dto.audienceFilter.status ?? 'all', search: dto.audienceFilter.search?.trim() ?? '' }
        : Prisma.JsonNull;
    return { recipientIds, audienceFilter };
  }

  // ── Bản nháp & chiến dịch ───────────────────────────────────────────────
  async getCampaigns() {
    return this.prisma.marketingCampaign.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createDraft(dto: CreateCampaignDto, createdBy?: number) {
    const { recipientIds, audienceFilter } = this.buildAudiencePayload(dto);
    const recipientEstimate = await this.computeRecipientEstimate({
      audience: dto.audience,
      audienceFilter: dto.audienceFilter,
      recipientIds,
    });

    return this.prisma.marketingCampaign.create({
      data: {
        campaignName: dto.campaignName,
        type: dto.type,
        subject: dto.subject ?? '',
        previewText: dto.previewText,
        body: dto.body ?? '',
        audience: dto.audience,
        audienceFilter,
        recipientIds,
        status: 'DRAFT',
        recipientEstimate,
        createdBy,
      },
    });
  }

  async updateDraft(id: string, dto: UpdateCampaignDto) {
    const existing = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!existing || existing.status !== 'DRAFT') {
      throw new NotFoundException('Không tìm thấy bản nháp chiến dịch');
    }

    const audience = dto.audience ?? existing.audience;
    const dtoFilter = (dto.audienceFilter ?? (existing.audienceFilter as { status?: SubscriberStatusFilter; search?: string } | null)) ?? undefined;
    const dtoRecipientIds = dto.recipientIds ?? existing.recipientIds;
    const { recipientIds, audienceFilter } = this.buildAudiencePayload({
      audience,
      audienceFilter: dtoFilter,
      recipientIds: dtoRecipientIds,
    });
    const recipientEstimate = await this.computeRecipientEstimate({
      audience,
      audienceFilter: dtoFilter,
      recipientIds,
    });

    return this.prisma.marketingCampaign.update({
      where: { id },
      data: {
        campaignName: dto.campaignName ?? existing.campaignName,
        type: dto.type ?? existing.type,
        subject: dto.subject ?? existing.subject,
        previewText: dto.previewText ?? existing.previewText,
        body: dto.body ?? existing.body,
        audience,
        audienceFilter,
        recipientIds,
        recipientEstimate,
      },
    });
  }

  async deleteDraft(id: string) {
    const deleted = await this.prisma.marketingCampaign.deleteMany({
      where: { id, status: 'DRAFT' },
    });
    if (deleted.count === 0) throw new NotFoundException('Không tìm thấy bản nháp chiến dịch');
    return { success: true, message: 'draft_deleted' };
  }

  async scheduleCampaign(id: string, scheduledAt: string) {
    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Thời gian gửi không hợp lệ');
    }
    if (scheduledDate.getTime() < Date.now() + 30_000) {
      throw new BadRequestException('Thời gian gửi phải sau hiện tại ít nhất 30 giây');
    }

    const campaign = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Không tìm thấy bản nháp chiến dịch');
    if (campaign.status !== 'DRAFT') {
      throw new ConflictException('Chỉ có thể lên lịch chiến dịch ở dạng bản nháp');
    }
    if (!campaign.subject?.trim() || !campaign.body?.trim()) {
      throw new BadRequestException('Vui lòng nhập tiêu đề và nội dung email trước khi lên lịch gửi');
    }
    if (campaign.audience === 'MANUAL_SELECTION' && this.normalizeRecipientIds(campaign.recipientIds).length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một người đăng ký để gửi');
    }

    const recipientEstimate = await this.computeRecipientEstimate({
      audience: campaign.audience,
      audienceFilter: campaign.audienceFilter as { status?: SubscriberStatusFilter; search?: string } | null,
      recipientIds: campaign.recipientIds,
    });

    const updated = await this.prisma.marketingCampaign.updateMany({
      where: { id, status: 'DRAFT' },
      data: {
        status: 'SCHEDULED',
        scheduledAt: scheduledDate,
        recipientEstimate,
        processedCount: 0,
        sentCount: 0,
        failedCount: 0,
        lastProcessedRecipientId: null,
        lockedAt: null,
        sentAt: null,
        cancelledAt: null,
        errorMessage: null,
      },
    });
    if (updated.count === 0) {
      throw new ConflictException('Chỉ có thể lên lịch chiến dịch ở dạng bản nháp');
    }
    return this.prisma.marketingCampaign.findUnique({ where: { id } });
  }

  async cancelCampaign(id: string) {
    const cancelled = await this.prisma.marketingCampaign.updateMany({
      where: { id, status: 'SCHEDULED' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (cancelled.count === 0) {
      const existing = await this.prisma.marketingCampaign.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Không tìm thấy chiến dịch');
      throw new ConflictException('Chỉ có thể hủy chiến dịch chưa bắt đầu gửi');
    }
    return this.prisma.marketingCampaign.findUnique({ where: { id } });
  }

  // ── Cron: gửi các chiến dịch đến hạn ────────────────────────────────────
  async processDueCampaigns() {
    if (this.isProcessingCampaigns) return;
    this.isProcessingCampaigns = true;

    try {
      const candidates = await this.prisma.marketingCampaign.findMany({
        where: {
          status: { in: ACTIVE_CAMPAIGN_STATUSES },
          scheduledAt: { lte: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
        select: { id: true },
      });

      for (const { id } of candidates) {
        const claimNow = new Date();
        // Giành khóa: chỉ một worker xử lý một chiến dịch tại một thời điểm
        const claim = await this.prisma.marketingCampaign.updateMany({
          where: {
            id,
            status: { in: ACTIVE_CAMPAIGN_STATUSES },
            scheduledAt: { lte: claimNow },
            OR: [
              { lockedAt: null },
              { lockedAt: { lt: new Date(claimNow.getTime() - CAMPAIGN_LOCK_TTL_MS) } },
            ],
          },
          data: { status: 'SENDING', lockedAt: claimNow },
        });
        if (claim.count === 0) continue;

        try {
          await this.processCampaignBatch(id);
        } catch (error) {
          await this.prisma.marketingCampaign.update({
            where: { id },
            data: {
              status: 'FAILED',
              errorMessage: error instanceof Error ? error.message : 'Lỗi gửi chiến dịch không xác định',
              lockedAt: null,
            },
          });
        }
      }
    } finally {
      this.isProcessingCampaigns = false;
    }
  }

  private async processCampaignBatch(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!campaign) return;

    const audienceFilter = campaign.audienceFilter as { status?: SubscriberStatusFilter; search?: string } | null;
    const isInactiveFilter = campaign.audience === 'CURRENT_FILTER' && audienceFilter?.status === 'inactive';

    const recipientPage = isInactiveFilter
      ? []
      : await this.prisma.subscriber.findMany({
          where: {
            AND: [
              this.getAudienceWhere({
                audience: campaign.audience,
                audienceFilter,
                recipientIds: campaign.recipientIds,
              }),
              { id: { gt: campaign.lastProcessedRecipientId ?? 0 } },
            ],
          },
          select: { id: true, email: true, unsubscribeToken: true },
          orderBy: { id: 'asc' },
          take: CAMPAIGN_BATCH_SIZE + 1,
        });

    const recipients = recipientPage.slice(0, CAMPAIGN_BATCH_SIZE);
    const hasMoreRecipients = recipientPage.length > CAMPAIGN_BATCH_SIZE;

    let sentCount = campaign.sentCount;
    let failedCount = campaign.failedCount;
    let processedCount = campaign.processedCount;
    let lastProcessedRecipientId = campaign.lastProcessedRecipientId;

    for (const recipient of recipients) {
      try {
        await this.mailService.sendMarketingCampaignEmail({
          to: recipient.email,
          campaignName: campaign.campaignName,
          subject: campaign.subject,
          previewText: campaign.previewText ?? undefined,
          body: campaign.body,
          unsubscribeToken: recipient.unsubscribeToken,
        });
        sentCount += 1;
      } catch {
        failedCount += 1;
      }
      processedCount += 1;
      lastProcessedRecipientId = recipient.id;
    }

    if (hasMoreRecipients) {
      // Còn người nhận: nhả khóa để tick sau xử lý batch tiếp theo
      await this.prisma.marketingCampaign.update({
        where: { id },
        data: { sentCount, failedCount, processedCount, lastProcessedRecipientId, lockedAt: null },
      });
      return;
    }

    await this.prisma.marketingCampaign.update({
      where: { id },
      data: {
        status: failedCount > 0 && sentCount === 0 ? 'FAILED' : 'SENT',
        sentCount,
        failedCount,
        processedCount,
        lastProcessedRecipientId,
        sentAt: new Date(),
        lockedAt: null,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.subscriber.delete({ where: { id } });
  }
}
