import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TourStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TourPermissionService } from './tour-permission.service';
import { requirePublishableTour, getMinBookableDate } from './tour-helpers';

@Injectable()
export class TourWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tourPermission: TourPermissionService,
  ) {}

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

    return this.prisma.tour.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedById: reviewerId,
        reviewNote: action === 'reject' ? note?.trim() : null,
        publishedAt: action === 'approve' ? new Date() : null,
      },
    });
  }

  async publishTour(id: number, publisherId: number) {
    const tour = await this.findTourForPublishability(id);
    if (!tour) throw new NotFoundException(`Không tìm thấy tour #${id}`);

    if (tour.status === TourStatus.COMPLETED)
      throw new BadRequestException('Tour đã kết thúc, không thể public lại');

    requirePublishableTour(tour, {
      requireDepartures: true,
      requirePackages: true,
    });

    return this.prisma.tour.update({
      where: { id },
      data: {
        status: TourStatus.PUBLISHED,
        reviewedById: publisherId,
        reviewNote: null,
        publishedAt: new Date(),
      },
    });
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
