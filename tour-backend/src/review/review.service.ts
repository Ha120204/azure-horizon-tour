import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, TourStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AdminQueryReviewDto } from './dto/admin-query-review.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  private getDurationDays(duration?: string | null): number {
    const match = duration?.match(/\d+/);
    const days = match ? Number(match[0]) : 1;
    return Number.isFinite(days) && days > 0 ? days : 1;
  }

  private getTripCompletedAt(startDate: Date, duration?: string | null): Date {
    const completedAt = new Date(startDate);
    completedAt.setDate(completedAt.getDate() + this.getDurationDays(duration));
    return completedAt;
  }

  // ─── Customer APIs ────────────────────────────────────────────────────────

  async createReview(userId: number, tourId: number, dto: CreateReviewDto) {
    const tour = await this.prisma.tour.findFirst({
      where: { id: tourId, deletedAt: null },
    });
    if (!tour) throw new NotFoundException('Tour not found');

    const confirmedBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        tourId,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
      include: {
        tour: { select: { startDate: true, duration: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!confirmedBooking) {
      throw new BadRequestException(
        'Bạn cần có booking đã xác nhận và thanh toán để gửi đánh giá.',
      );
    }

    let tripStartDate = confirmedBooking.tour.startDate;
    if (confirmedBooking.departureId) {
      const departure = await this.prisma.tourDeparture.findUnique({
        where: { id: confirmedBooking.departureId },
        select: { departureDate: true },
      });
      tripStartDate = departure?.departureDate ?? tripStartDate;
    }

    const completedAt = this.getTripCompletedAt(
      tripStartDate,
      confirmedBooking.tour.duration,
    );
    const isCompletedByDate = new Date() >= completedAt;
    const isTourMarkedCompleted =
      confirmedBooking.tour.status === TourStatus.COMPLETED;

    if (!isCompletedByDate && !isTourMarkedCompleted) {
      throw new BadRequestException(
        'Chỉ có thể đánh giá sau khi chuyến đi đã hoàn tất.',
      );
    }

    const existingReview = await this.prisma.review.findFirst({
      where: { userId, tourId },
    });
    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá trải nghiệm này rồi.');
    }

    const newReview = await this.prisma.review.create({
      data: {
        userId,
        tourId,
        rating: dto.rating,
        content: dto.content,
        imageUrls: dto.imageUrls || [],
      },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
      },
    });

    await this._recalcTourRating(tourId);
    return newReview;
  }

  async getTourReviews(
    tourId: number,
    page: number = 1,
    limit: number = 5,
    sortBy?: string,
    filter?: string,
  ) {
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ReviewWhereInput = { tourId, isHidden: false };
    if (filter === '5stars') whereClause.rating = 5;
    else if (filter === '4stars') whereClause.rating = 4;
    else if (filter === '3stars') whereClause.rating = 3;
    else if (filter === '2stars') whereClause.rating = 2;
    else if (filter === '1star') whereClause.rating = 1;
    else if (filter === 'photos') whereClause.imageUrls = { isEmpty: false };

    let orderByClause: Prisma.ReviewOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (sortBy === 'rating_desc') orderByClause = { rating: 'desc' };
    else if (sortBy === 'rating_asc') orderByClause = { rating: 'asc' };

    const [reviews, totalCount, aggregations, groupByRatings] =
      await Promise.all([
        this.prisma.review.findMany({
          where: whereClause,
          orderBy: orderByClause,
          skip,
          take: limit,
          include: {
            user: { select: { fullName: true, avatarUrl: true } },
          },
        }),
        this.prisma.review.count({ where: whereClause }),
        this.prisma.review.aggregate({
          where: { tourId, isHidden: false },
          _avg: { rating: true },
        }),
        this.prisma.review.groupBy({
          by: ['rating'],
          _count: { rating: true },
          where: { tourId, isHidden: false },
        }),
      ]);

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    groupByRatings.forEach((group) => {
      if (group.rating >= 1 && group.rating <= 5) {
        breakdown[group.rating as keyof typeof breakdown] = group._count.rating;
      }
    });

    return {
      data: reviews,
      meta: {
        totalItems: totalCount,
        itemCount: reviews.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      },
      stats: {
        averageRating: Number((aggregations._avg.rating || 0).toFixed(1)),
        totalReviews: totalCount,
        breakdown,
      },
    };
  }

  // ─── Admin APIs ───────────────────────────────────────────────────────────

  async getAdminStats() {
    const [total, hidden, aggregations, groupByRatings] = await Promise.all([
      this.prisma.review.count(),
      this.prisma.review.count({ where: { isHidden: true } }),
      this.prisma.review.aggregate({ _avg: { rating: true } }),
      this.prisma.review.groupBy({
        by: ['rating'],
        _count: { rating: true },
      }),
    ]);

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    groupByRatings.forEach((group) => {
      if (group.rating >= 1 && group.rating <= 5) {
        breakdown[group.rating as keyof typeof breakdown] = group._count.rating;
      }
    });

    const fiveStarCount = breakdown[5];
    const fiveStarRate =
      total > 0 ? Math.round((fiveStarCount / total) * 100) : 0;

    return {
      total,
      hidden,
      averageRating: Number((aggregations._avg.rating || 0).toFixed(1)),
      fiveStarRate,
      breakdown,
    };
  }

  async getAllReviewsAdmin(query: AdminQueryReviewDto) {
    const {
      page = 1,
      limit = 10,
      search,
      rating,
      status,
      tourId,
      sortBy,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};
    if (status === 'hidden') where.isHidden = true;
    else if (status === 'visible') where.isHidden = false;
    if (rating) where.rating = Number(rating);
    if (tourId) where.tourId = Number(tourId);
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { tour: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    let orderBy: Prisma.ReviewOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sortBy === 'rating_desc') orderBy = { rating: 'desc' };
    else if (sortBy === 'rating_asc') orderBy = { rating: 'asc' };

    const [reviews, totalItems] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: Number(limit),
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true, email: true },
          },
          tour: { select: { id: true, name: true, tourCode: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      meta: {
        totalItems,
        itemCount: reviews.length,
        itemsPerPage: Number(limit),
        totalPages: Math.ceil(totalItems / Number(limit)),
        currentPage: Number(page),
      },
    };
  }

  async toggleVisibility(id: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review không tồn tại');

    const updated = await this.prisma.review.update({
      where: { id },
      data: { isHidden: !review.isHidden },
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true, email: true },
        },
        tour: { select: { id: true, name: true, tourCode: true } },
      },
    });

    // Cập nhật avgRating của tour (chỉ tính review visible)
    await this._recalcTourRating(review.tourId);
    return updated;
  }

  async deleteReview(id: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review không tồn tại');

    await this.prisma.review.delete({ where: { id } });
    await this._recalcTourRating(review.tourId);
    return { message: 'Đã xóa đánh giá thành công' };
  }

  async replyReview(id: number, content: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review không tồn tại');

    return this.prisma.review.update({
      where: { id },
      data: { adminReply: content },
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true, email: true },
        },
        tour: { select: { id: true, name: true, tourCode: true } },
      },
    });
  }

  async bulkToggleVisibility(ids: number[], isHidden: boolean) {
    await this.prisma.review.updateMany({
      where: { id: { in: ids } },
      data: { isHidden },
    });
    // Recalc ratings for all affected tours
    const reviews = await this.prisma.review.findMany({
      where: { id: { in: ids } },
      select: { tourId: true },
    });
    const tourIds = [...new Set(reviews.map((r) => r.tourId))];
    await Promise.all(tourIds.map((tId) => this._recalcTourRating(tId)));
    return { message: `Đã cập nhật ${ids.length} đánh giá` };
  }

  async bulkDelete(ids: number[]) {
    const reviews = await this.prisma.review.findMany({
      where: { id: { in: ids } },
      select: { tourId: true },
    });
    await this.prisma.review.deleteMany({ where: { id: { in: ids } } });
    const tourIds = [...new Set(reviews.map((r) => r.tourId))];
    await Promise.all(tourIds.map((tId) => this._recalcTourRating(tId)));
    return { message: `Đã xóa ${ids.length} đánh giá` };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async _recalcTourRating(tourId: number) {
    const agg = await this.prisma.review.aggregate({
      where: { tourId, isHidden: false },
      _avg: { rating: true },
    });
    await this.prisma.tour.update({
      where: { id: tourId },
      data: {
        averageRating: Number((agg._avg.rating || 0).toFixed(1)),
      },
    });
  }
}
