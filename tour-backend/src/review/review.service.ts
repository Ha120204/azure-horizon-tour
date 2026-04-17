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

    return this.prisma.review.create({
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
  }

  async getTourReviews(tourId: number, page: number = 1, limit: number = 5) {
    const skip = (page - 1) * limit;

    const [reviews, totalCount, aggregations] = await Promise.all([
      this.prisma.review.findMany({
        where: { tourId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { fullName: true, avatarUrl: true } }
        }
      }),
      this.prisma.review.count({ where: { tourId } }),
      this.prisma.review.aggregate({
        where: { tourId },
        _avg: { rating: true }
      })
    ]);

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
        totalReviews: totalCount
      }
    };
  }
}
