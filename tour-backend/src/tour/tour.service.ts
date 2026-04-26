import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTourDto } from './dto/create-tour.dto';
import { FilterTourDto } from './dto/filter-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TourService {
  constructor(private readonly prisma: PrismaService) { }

  create(createTourDto: CreateTourDto) {
    const { destinationId, ...rest } = createTourDto;
    return this.prisma.tour.create({
      data: {
        ...rest,
        destination: { connect: { id: destinationId } },
      },
    });
  }

  async findAll(query: FilterTourDto = {}) {
    const { dest, minPrice, maxPrice, date, ratings, types, sortBy, page = "1", limit = "10" } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (dest) {
      where.OR = [
        { name: { contains: dest, mode: 'insensitive' } },
        { destination: { name: { contains: dest, mode: 'insensitive' } } }
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice && maxPrice !== 'unlimited') where.price.lte = parseFloat(maxPrice);
    }

    if (date) {
      where.startDate = { gte: new Date(date) };
    }

    if (ratings) {
      const ratingArr = ratings.split(',').map(r => parseFloat(r));
      where.averageRating = { gte: Math.min(...ratingArr) };
    }

    if (types) {
      const typeArr = types.split(',');
      where.tourType = { in: typeArr };
    }

    let orderBy: any = { id: 'asc' };
    if (sortBy === 'priceLowHigh') orderBy = { price: 'asc' };
    else if (sortBy === 'priceHighLow') orderBy = { price: 'desc' };
    else if (sortBy === 'recommended') orderBy = { averageRating: 'desc' };

    const [tours, totalItems] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          destination: { select: { name: true } },
          departures: { select: { price: true }, where: { isActive: true } }
        }
      }),
      this.prisma.tour.count({ where })
    ]);

    return {
      data: tours,
      meta: {
        totalItems,
        itemCount: tours.length,
        itemsPerPage: limitNum,
        totalPages: Math.ceil(totalItems / limitNum),
        currentPage: pageNum,
      }
    };
  }

  async findOne(id: number) {
    const tour = await this.prisma.tour.findUnique({
      where: { id, deletedAt: null },
      include: {
        destination: true,
        itinerary: { orderBy: { dayNumber: 'asc' } },
        packages: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        departures: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { departureDate: 'asc' }],
        },
        images: { orderBy: { sortOrder: 'asc' } },
        highlights: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { fullName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!tour) {
      throw new NotFoundException(`Tour with ID ${id} not found`);
    }
    return tour;
  }

  update(id: number, updateTourDto: UpdateTourDto) {
    const { destinationId, ...rest } = updateTourDto;
    return this.prisma.tour.update({
      where: { id, deletedAt: null },
      data: {
        ...rest,
        ...(destinationId !== undefined && {
          destination: { connect: { id: destinationId } },
        }),
      },
    });
  }

  async remove(id: number) {
    const tour = await this.prisma.tour.findUnique({
      where: { id, deletedAt: null },
    });
    if (!tour) {
      throw new NotFoundException(`Tour with ID ${id} not found`);
    }
    return this.prisma.tour.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Gallery ──────────────────────────────────────────────────

  async addGalleryImages(tourId: number, urls: string[]) {
    const existing = await this.prisma.tourImage.findMany({
      where: { tourId },
      orderBy: { sortOrder: 'desc' },
      take: 1,
    });
    const baseOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
    const data = urls.map((url, i) => ({ tourId, url, sortOrder: baseOrder + i }));
    await this.prisma.tourImage.createMany({ data });
    return this.findOne(tourId);
  }

  async removeGalleryImage(tourId: number, imageId: number) {
    await this.prisma.tourImage.delete({ where: { id: imageId, tourId } });
    return { message: 'Image removed' };
  }

  // ── Highlights ────────────────────────────────────────────────

  async upsertHighlights(tourId: number, highlights: { content: string; icon?: string; sortOrder?: number }[]) {
    await this.prisma.tourHighlight.deleteMany({ where: { tourId } });
    if (highlights.length > 0) {
      await this.prisma.tourHighlight.createMany({
        data: highlights.map((h, i) => ({
          tourId,
          content: h.content,
          icon: h.icon ?? 'auto_awesome',
          sortOrder: h.sortOrder ?? i,
        })),
      });
    }
    return this.prisma.tourHighlight.findMany({ where: { tourId }, orderBy: { sortOrder: 'asc' } });
  }

  // ── FAQs ──────────────────────────────────────────────────────

  async upsertFaqs(tourId: number, faqs: { question: string; answer: string; sortOrder?: number }[]) {
    await this.prisma.tourFAQ.deleteMany({ where: { tourId } });
    if (faqs.length > 0) {
      await this.prisma.tourFAQ.createMany({
        data: faqs.map((f, i) => ({
          tourId,
          question: f.question,
          answer: f.answer,
          sortOrder: f.sortOrder ?? i,
        })),
      });
    }
    return this.prisma.tourFAQ.findMany({ where: { tourId }, orderBy: { sortOrder: 'asc' } });
  }

  // ── Itinerary Day Update ───────────────────────────────────────

  async updateItineraryDay(tourId: number, dayId: number, data: {
    title?: string;
    description?: string;
    mealsBreakfast?: boolean;
    mealsLunch?: boolean;
    mealsDinner?: boolean;
    accommodation?: string;
    transport?: string;
    activities?: string[];
    imageUrl?: string;
    timeline?: any[];
  }) {
    const day = await this.prisma.tourItinerary.findFirst({ where: { id: dayId, tourId } });
    if (!day) throw new NotFoundException(`Itinerary day ${dayId} not found for tour ${tourId}`);
    return this.prisma.tourItinerary.update({ where: { id: dayId }, data });
  }

  // ── Rating Stats ──────────────────────────────────────────────

  async getRatingStats(tourId: number) {
    const reviews = await this.prisma.review.findMany({
      where: { tourId, isHidden: false },
      select: { rating: true },
    });
    const total = reviews.length;
    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const r of reviews) {
      breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1;
      sum += r.rating;
    }
    const averageRating = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
    return {
      averageRating,
      totalReviews: total,
      breakdown: [5, 4, 3, 2, 1].map(star => ({
        star,
        count: breakdown[star] ?? 0,
        percent: total > 0 ? Math.round(((breakdown[star] ?? 0) / total) * 100) : 0,
      })),
    };
  }

  // ── Sale Deals ────────────────────────────────────────────────
  async getSaleDeals() {
    const saleTypes = ['FLASH_SALE', 'EARLY_BIRD', 'LAST_MINUTE'];

    const departures = await this.prisma.tourDeparture.findMany({
      where: {
        note: { in: saleTypes },
        isActive: true,
        tour: { deletedAt: null },
      },
      include: {
        tour: {
          include: { destination: { select: { name: true } } },
        },
      },
      orderBy: { departureDate: 'asc' },
    });

    return departures.map(dep => {
      const tour = dep.tour as any;
      const salePrice = dep.price ?? tour.price;
      const originalPrice = tour.price;
      const discountPct = Math.round(((originalPrice - salePrice) / originalPrice) * 100);

      const categoryMap: Record<string, string> = {
        FLASH_SALE:  'flash',
        EARLY_BIRD:  'early',
        LAST_MINUTE: 'lastminute',
      };
      const badgeMap: Record<string, string> = {
        FLASH_SALE:  'FLASH SALE',
        EARLY_BIRD:  'ĐẶT SỚM',
        LAST_MINUTE: 'GIỜ CHÓT',
      };

      return {
        id: dep.id,
        tourId: tour.id,
        name: tour.name,
        image: tour.imageUrl,
        badge: `${badgeMap[dep.note!] ?? dep.note} -${discountPct}%`,
        rating: tour.averageRating,
        duration: tour.duration,
        newPrice: salePrice,
        oldPrice: originalPrice,
        availableSeats: dep.availableSeats,
        departureDate: dep.departureDate,
        category: categoryMap[dep.note!] ?? 'all',
        destination: tour.destination?.name ?? '',
      };
    });
  }
}
