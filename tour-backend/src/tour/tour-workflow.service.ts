import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TourStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TourPermissionService } from './tour-permission.service';
import { AiEmbeddingService } from '../ai/ai-embedding.service';
import { ConfigService } from '@nestjs/config';
import { requirePublishableTour, getMinBookableDate } from './tour-helpers';

@Injectable()
export class TourWorkflowService {
  private readonly logger = new Logger(TourWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tourPermission: TourPermissionService,
    private readonly aiEmbedding: AiEmbeddingService,
    private readonly configService: ConfigService,
  ) {}

  private revalidateTourCache(tourId: number): void {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const secret = this.configService.get<string>('REVALIDATION_SECRET');
    if (!frontendUrl || !secret) return;

    void fetch(`${frontendUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tag: `tour-${tourId}` }),
    }).catch((err: unknown) => {
      this.logger.warn(`[Revalidate] tour-${tourId} failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  private findTourForPublishability(id: number) {
    return this.prisma.tour.findUnique({
      where: { id, deletedAt: null },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            travelScope: true,
            countryCode: true,
          },
        },
        departures: {
          where: {
            isActive: true,
            departureDate: { gte: getMinBookableDate() },
          },
          select: {
            departureDate: true,
            availableSeats: true,
            isActive: true,
          },
        },
        packages: {
          where: { isActive: true },
          select: { id: true, isActive: true },
        },
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // [TOUR - GỬI DUYỆT: DRAFT/REJECTED → PENDING_REVIEW] 3 lớp kiểm tra tuần tự:
  //   1. Đúng CHỦ tour (createdById === requesterId) — STAFF chỉ gửi tour của mình.
  //   2. Đúng trạng thái nguồn (phải là DRAFT hoặc REJECTED) — không gửi lại tour đang chờ.
  //   3. requirePublishableTour — cổng chất lượng: đủ thông tin + chuyến + gói.
  // Thiếu bất kỳ lớp nào → ném lỗi, không chuyển trạng thái.
  // ════════════════════════════════════════════════════════════════════════════
  async submitForReview(id: number, requesterId: number) {
    const tour = await this.findTourForPublishability(id);
    if (!tour) throw new NotFoundException(`Không tìm thấy tour #${id}`);

    if (tour.createdById !== requesterId)
      throw new ForbiddenException('Bạn không có quyền gửi duyệt tour này');

    if (
      tour.status !== TourStatus.DRAFT &&
      tour.status !== TourStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Tour đang ở trạng thái "${tour.status}", không thể gửi duyệt`,
      );
    }

    requirePublishableTour(tour, {
      requireDepartures: true,
      requirePackages: true,
    });

    return this.prisma.tour.update({
      where: { id },
      data: { status: TourStatus.PENDING_REVIEW, reviewNote: null },
    });
  }

  async bulkSubmitForReview(ids: number[], requesterId: number) {
    const uniqueIds = [
      ...new Set(ids.filter((id) => Number.isInteger(id) && id > 0)),
    ];
    if (uniqueIds.length === 0)
      throw new BadRequestException('Danh sách tour không hợp lệ');

    const tours = await this.prisma.tour.findMany({
      where: {
        id: { in: uniqueIds },
        deletedAt: null,
        createdById: requesterId,
        status: { in: [TourStatus.DRAFT, TourStatus.REJECTED] },
      },
      include: {
        destination: {
          select: { id: true, name: true, travelScope: true, countryCode: true },
        },
        departures: {
          where: {
            isActive: true,
            departureDate: { gte: getMinBookableDate() },
          },
          select: { departureDate: true, availableSeats: true, isActive: true },
        },
        packages: {
          where: { isActive: true },
          select: { id: true, isActive: true },
        },
      },
    });

    const eligibleIds: number[] = [];
    for (const tour of tours) {
      try {
        requirePublishableTour(tour, { requireDepartures: true, requirePackages: true });
        eligibleIds.push(tour.id);
      } catch {
        // Tour chưa đủ điều kiện → bỏ qua, không fail toàn batch
      }
    }

    if (eligibleIds.length > 0) {
      await this.prisma.tour.updateMany({
        where: { id: { in: eligibleIds } },
        data: { status: TourStatus.PENDING_REVIEW, reviewNote: null },
      });
    }

    return {
      submitted: eligibleIds.length,
      skipped: uniqueIds.length - eligibleIds.length,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // [TOUR - DUYỆT / TỪ CHỐI: PENDING_REVIEW → PUBLISHED | REJECTED]
  // approve: requirePublishableTour LẦN 2 (dữ liệu có thể đổi sau khi STAFF submit)
  //   → PUBLISHED + 2 việc chạy nền: embedTourAsync (AI vector) + revalidateTourCache (Next.js ISR).
  // reject: bắt buộc có note lý do → REJECTED + lưu reviewNote để STAFF biết sửa gì.
  //   Khi STAFF gửi lại, reviewNote bị xóa (reviewNote: null).
  // ════════════════════════════════════════════════════════════════════════════
  async reviewTour(
    id: number,
    reviewerId: number,
    action: 'approve' | 'reject',
    note?: string,
  ) {
    const tour = await this.findTourForPublishability(id);
    if (!tour) throw new NotFoundException(`Không tìm thấy tour #${id}`);

    if (tour.status !== TourStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Tour đang ở trạng thái "${tour.status}", không thể duyệt`,
      );
    }
    if (action === 'reject' && !note?.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối');
    }
    if (action === 'approve') {
      requirePublishableTour(tour, {
        requireDepartures: true,
        requirePackages: true,
      });
    }

    const newStatus =
      action === 'approve' ? TourStatus.PUBLISHED : TourStatus.REJECTED;

    const updated = await this.prisma.tour.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedById: reviewerId,
        reviewNote: action === 'reject' ? note?.trim() : null,
        publishedAt: action === 'approve' ? new Date() : null,
      },
    });

    if (action === 'approve') {
      this.aiEmbedding.embedTourAsync(id);
      this.revalidateTourCache(id);
    }
    return updated;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // [TOUR - PUBLISH THẲNG: DRAFT → PUBLISHED (bỏ qua bước duyệt)]
  // ADMIN tự tạo tour → không cần ai duyệt → publish trực tiếp.
  // Chặn duy nhất: không public lại tour COMPLETED (đã kết thúc vĩnh viễn).
  // Sau publish: cùng 2 việc nền với reviewTour approve (embedTourAsync + revalidate).
  // ════════════════════════════════════════════════════════════════════════════
  async publishTour(id: number, publisherId: number) {
    const tour = await this.findTourForPublishability(id);
    if (!tour) throw new NotFoundException(`Không tìm thấy tour #${id}`);

    if (tour.status === TourStatus.COMPLETED)
      throw new BadRequestException('Tour đã kết thúc, không thể public lại');

    requirePublishableTour(tour, {
      requireDepartures: true,
      requirePackages: true,
    });

    const updated = await this.prisma.tour.update({
      where: { id },
      data: {
        status: TourStatus.PUBLISHED,
        reviewedById: publisherId,
        reviewNote: null,
        publishedAt: new Date(),
      },
    });

    this.aiEmbedding.embedTourAsync(id);
    this.revalidateTourCache(id);
    return updated;
  }

  async getPendingTours() {
    const [tours, count] = await Promise.all([
      this.prisma.tour.findMany({
        where: { status: TourStatus.PENDING_REVIEW, deletedAt: null },
        orderBy: { updatedAt: 'asc' },
        include: {
          destination: {
            select: {
              id: true,
              name: true,
              travelScope: true,
              countryCode: true,
            },
          },
          createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      }),
      this.prisma.tour.count({
        where: { status: TourStatus.PENDING_REVIEW, deletedAt: null },
      }),
    ]);
    return { data: tours, count };
  }
}
