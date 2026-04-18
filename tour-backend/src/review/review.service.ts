import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(userId: number, tourId: number, dto: CreateReviewDto) {
    const tour = await this.prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour) throw new NotFoundException('Tour not found');

    const existingReview = await this.prisma.review.findFirst({
      where: { userId, tourId }
    });
    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá trải nghiệm này rồi.');
    }

    // Optional: check if booking exists to "verify" the purchase
    const booking = await this.prisma.booking.findFirst({
      where: { userId, tourId, status: 'CONFIRMED' }
    });

    const newReview = await this.prisma.review.create({
      data: {
        userId,
        tourId,
        rating: dto.rating,
        content: dto.content,
        imageUrls: dto.imageUrls || [],
      },
      include: {
        user: { select: { fullName: true, avatarUrl: true } }
      }
    });

    const aggregations = await this.prisma.review.aggregate({
      where: { tourId },
      _avg: { rating: true }
    });

    await this.prisma.tour.update({
      where: { id: tourId },
      data: { averageRating: Number((aggregations._avg.rating || 0).toFixed(1)) }
    });

    return newReview;
  }

  async getTourReviews(tourId: number, page: number = 1, limit: number = 5, sortBy?: string, filter?: string) {
    const skip = (page - 1) * limit;

    let whereClause: any = { tourId };
    if (filter === '5stars') whereClause.rating = 5;
    else if (filter === '4stars') whereClause.rating = 4;
    else if (filter === '3stars') whereClause.rating = 3;
    else if (filter === '2stars') whereClause.rating = 2;
    else if (filter === '1star') whereClause.rating = 1;
    else if (filter === 'photos') whereClause.imageUrls = { isEmpty: false };

    let orderByClause: any = { createdAt: 'desc' }; // default newest
    if (sortBy === 'rating_desc') orderByClause = { rating: 'desc' };
    else if (sortBy === 'rating_asc') orderByClause = { rating: 'asc' };

    const [reviews, totalCount, aggregations, groupByRatings] = await Promise.all([
      this.prisma.review.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: {
          user: { select: { fullName: true, avatarUrl: true } }
        }
      }),
      this.prisma.review.count({ where: whereClause }),
      this.prisma.review.aggregate({
        where: { tourId }, // aggregate always for all reviews
        _avg: { rating: true }
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        _count: { rating: true },
        where: { tourId }
      })
    ]);

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    groupByRatings.forEach(group => {
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
        breakdown
      }
    };
  }
}
