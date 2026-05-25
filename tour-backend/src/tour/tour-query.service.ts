import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, TourStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeLocale, localizeTour, toEnglishNameFallback } from './tour-localization';
import { getMinBookableDate, isAdminLikeRole, sanitizePublicTourDetail } from './tour-helpers';
import { SALE_DEPARTURE_CATEGORIES } from './promotion-rules';
import { UpdateTourDto } from './dto/update-tour.dto';

@Injectable()
export class TourQueryService {
  constructor(private readonly prisma: PrismaService) {}

  // ── FindOne ────────────────────────────────────────────────────────────────

  async findOne(id: number, requesterId?: number, requesterRole?: string, localeInput?: string) {
    const locale = normalizeLocale(localeInput);
    const where: Prisma.TourWhereInput = { id, deletedAt: null };

    if (requesterRole === 'STAFF' && requesterId) {
      where.OR = [{ status: TourStatus.PUBLISHED }, { createdById: requesterId }];
    } else if (requesterRole !== 'SUPER_ADMIN' && requesterRole !== 'ADMIN') {
      where.status = TourStatus.PUBLISHED;
      where.OR = [
        { startDate: { gte: getMinBookableDate() } },
        { departures: { some: { isActive: true, departureDate: { gte: getMinBookableDate() } } } },
      ];
    }

    const tour = await this.prisma.tour.findFirst({
      where,
      include: {
        destination: true,
        itinerary: { orderBy: { dayNumber: 'asc' } },
        packages: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        departures: { where: { isActive: true, departureDate: { gte: getMinBookableDate() } }, orderBy: [{ sortOrder: 'asc' }, { departureDate: 'asc' }] },
        images: { orderBy: { sortOrder: 'asc' } },
        highlights: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        reviews: { where: { isHidden: false }, take: 5, orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, avatarUrl: true } } } },
        createdBy: { select: { id: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!tour) throw new NotFoundException(`Tour with ID ${id} not found`);
    const localizedTour = localizeTour(tour, locale);
    return isAdminLikeRole(requesterRole) ? localizedTour : sanitizePublicTourDetail(localizedTour);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: number, updateTourDto: UpdateTourDto, requesterId?: number, requesterRole?: string) {
    const tour = await this.prisma.tour.findUnique({ where: { id, deletedAt: null } });
    if (!tour) throw new NotFoundException(`Tour with ID ${id} not found`);

    const isAdminRole = requesterRole === 'SUPER_ADMIN' || requesterRole === 'ADMIN';
    if (!isAdminRole) {
      if (tour.createdById !== requesterId) throw new ForbiddenException('Ban khong co quyen chinh sua tour nay');
      if (tour.status !== TourStatus.DRAFT && tour.status !== TourStatus.REJECTED)
        throw new ForbiddenException('Chi co the chinh sua tour o trang thai Ban nhap hoac Bi tu choi');
    }

    const { destinationId, status, ...rest } = updateTourDto;
    return this.prisma.tour.update({
      where: { id },
      data: {
        ...rest,
        ...(rest.name !== undefined && { name: rest.name?.trim() ?? '' }),
        ...(rest.nameEn !== undefined && { nameEn: rest.nameEn?.trim() || null }),
        ...(rest.description !== undefined && { description: rest.description?.trim() ?? '' }),
        ...(rest.descriptionEn !== undefined && { descriptionEn: rest.descriptionEn?.trim() || null }),
        ...(rest.duration !== undefined && { duration: rest.duration?.trim() || 'Chua xac dinh' }),
        ...(rest.durationEn !== undefined && { durationEn: rest.durationEn?.trim() || null }),
        ...(rest.imageUrl !== undefined && { imageUrl: rest.imageUrl?.trim() || null }),
        ...(rest.tourType !== undefined && { tourType: rest.tourType?.trim() || 'Luxury Retreat' }),
        ...(rest.departurePoint !== undefined && { departurePoint: rest.departurePoint?.trim() || null }),
        ...(rest.departurePointEn !== undefined && { departurePointEn: rest.departurePointEn?.trim() || null }),
        ...(isAdminRole && status !== undefined && { status, publishedAt: status === TourStatus.PUBLISHED ? (tour.publishedAt ?? new Date()) : null }),
        ...(destinationId !== undefined && { destination: { connect: { id: destinationId } } }),
      },
    });
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: number, requesterId?: number, requesterRole?: string) {
    const tour = await this.prisma.tour.findUnique({ where: { id, deletedAt: null } });
    if (!tour) throw new NotFoundException(`Tour with ID ${id} not found`);
    const isAdminRole = requesterRole === 'SUPER_ADMIN' || requesterRole === 'ADMIN';
    if (!isAdminRole) {
      if (tour.createdById !== requesterId) throw new ForbiddenException('Ban khong co quyen xoa ban nhap nay');
      if (tour.status !== TourStatus.DRAFT && tour.status !== TourStatus.REJECTED)
        throw new BadRequestException('Chi co the xoa tour o trang thai Ban nhap hoac Bi tu choi');
    }
    return this.prisma.tour.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Admin Stats ────────────────────────────────────────────────────────────

  async getAdminStats(requesterId?: number, requesterRole?: string) {
    const isAdminRole = requesterRole === 'SUPER_ADMIN' || requesterRole === 'ADMIN';

    const visibleWhere: Prisma.TourWhereInput = { deletedAt: null };
    if (requesterRole === 'STAFF' && requesterId) {
      visibleWhere.OR = [{ status: TourStatus.PUBLISHED }, { createdById: requesterId }];
    } else if (!isAdminRole) {
      visibleWhere.status = TourStatus.PUBLISHED;
    }

    const workflowWhere = (status: TourStatus): Prisma.TourWhereInput => ({
      deletedAt: null,
      status,
      ...(requesterRole === 'STAFF' && requesterId ? { createdById: requesterId } : {}),
    });

    const publishedWhere: Prisma.TourWhereInput = { deletedAt: null, status: TourStatus.PUBLISHED };
    const futurePublishedWhere: Prisma.TourWhereInput = { ...publishedWhere, startDate: { gte: new Date() } };

    const [totalVisible, total, published, draft, pending, rejected, completed, seatsAgg, priceAgg] =
      await Promise.all([
        this.prisma.tour.count({ where: visibleWhere }),
        this.prisma.tour.count({ where: { deletedAt: null } }),
        this.prisma.tour.count({ where: publishedWhere }),
        this.prisma.tour.count({ where: workflowWhere(TourStatus.DRAFT) }),
        this.prisma.tour.count({ where: workflowWhere(TourStatus.PENDING_REVIEW) }),
        this.prisma.tour.count({ where: workflowWhere(TourStatus.REJECTED) }),
        this.prisma.tour.count({ where: workflowWhere(TourStatus.COMPLETED) }),
        this.prisma.tour.aggregate({ where: futurePublishedWhere, _sum: { availableSeats: true } }),
        this.prisma.tour.aggregate({ where: publishedWhere, _avg: { price: true } }),
      ]);

    return {
      totalVisible, total, published, draft, pending, rejected, completed,
      active: published,
      totalSeats: Number(seatsAgg._sum.availableSeats ?? 0),
      avgPrice: Number(priceAgg._avg.price ?? 0),
    };
  }

  // ── Rating Stats ───────────────────────────────────────────────────────────

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
      breakdown: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: breakdown[star] ?? 0,
        percent: total > 0 ? Math.round(((breakdown[star] ?? 0) / total) * 100) : 0,
      })),
    };
  }

  // ── Trash management ───────────────────────────────────────────────────────

  async getTrashedTours(
    page = 1,
    limit = 10,
    query: { search?: string; status?: string; deletable?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.TourWhereInput = { deletedAt: { not: null } };

    if (query.search?.trim()) {
      const search = query.search.trim();
      const id = Number(search.replace(/^#/, ''));
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { destination: { name: { contains: search, mode: 'insensitive' } } },
        ...(Number.isInteger(id) && id > 0 ? [{ id }] : []),
      ];
    }
    if (query.status && Object.values(TourStatus).includes(query.status as TourStatus)) {
      where.status = query.status as TourStatus;
    }
    if (query.deletable === 'true') { where.bookings = { none: {} }; }
    else if (query.deletable === 'false') { where.bookings = { some: {} }; }

    const [tours, totalItems] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        skip, take: limit,
        include: {
          destination: { select: { id: true, name: true, travelScope: true, countryCode: true } },
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { bookings: true } },
        },
      }),
      this.prisma.tour.count({ where }),
    ]);

    return {
      data: tours.map(({ _count, ...tour }) => ({
        ...tour,
        bookingCount: _count.bookings,
        canPermanentDelete: _count.bookings === 0,
      })),
      meta: { totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page, itemsPerPage: limit },
    };
  }

  async restoreTour(id: number) {
    const tour = await this.prisma.tour.findFirst({ where: { id, deletedAt: { not: null } } });
    if (!tour) throw new NotFoundException(`Tour ${id} not found in trash`);
    return this.prisma.tour.update({ where: { id }, data: { deletedAt: null } });
  }

  private async assertCanPermanentDeleteTour(id: number) {
    const tour = await this.prisma.tour.findFirst({
      where: { id, deletedAt: { not: null } },
      include: { _count: { select: { bookings: true } } },
    });
    if (!tour) throw new NotFoundException(`Tour ${id} not found in trash`);
    if (tour._count.bookings > 0) {
      throw new BadRequestException('Tour da phat sinh booking, chi duoc luu tru va khoi phuc');
    }
    return tour;
  }

  async permanentDelete(id: number) {
    const tour = await this.assertCanPermanentDeleteTour(id);
    await this.prisma.tour.delete({ where: { id } });
    return { message: `Tour "${tour.name}" da bi xoa vinh vien.` };
  }

  async bulkRestoreTours(ids: number[]) {
    const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
    if (uniqueIds.length === 0) throw new BadRequestException('Danh sach tour khong hop le');
    const result = await this.prisma.tour.updateMany({
      where: { id: { in: uniqueIds }, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    return { requested: uniqueIds.length, restored: result.count, skipped: uniqueIds.length - result.count };
  }

  async bulkPermanentDelete(ids: number[]) {
    const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
    if (uniqueIds.length === 0) throw new BadRequestException('Danh sach tour khong hop le');

    const tours = await this.prisma.tour.findMany({
      where: { id: { in: uniqueIds }, deletedAt: { not: null } },
      include: { _count: { select: { bookings: true } } },
    });

    const foundIds = new Set(tours.map((t) => t.id));
    const blocked = tours.filter((t) => t._count.bookings > 0)
      .map((t) => ({ id: t.id, name: t.name, bookingCount: t._count.bookings }));
    const deletableIds = tours.filter((t) => t._count.bookings === 0).map((t) => t.id);

    if (deletableIds.length > 0) {
      await this.prisma.tour.deleteMany({ where: { id: { in: deletableIds } } });
    }

    return {
      requested: uniqueIds.length,
      deleted: deletableIds.length,
      blocked,
      notFound: uniqueIds.filter((id) => !foundIds.has(id)),
    };
  }

  // ── Sale Deals ────────────────────────────────────────────────────────────

  async getSaleDeals(localeInput?: string) {
    const locale = normalizeLocale(localeInput);
    const now = new Date();
    const saleCategories: string[] = [...SALE_DEPARTURE_CATEGORIES];

    const departures = await this.prisma.tourDeparture.findMany({
      where: {
        AND: [
          { OR: [{ category: { in: saleCategories } }, { category: null, note: { in: saleCategories } }] },
          { OR: [{ flashSaleEndsAt: null }, { flashSaleEndsAt: { gt: now } }] },
        ],
        isActive: true,
        departureDate: { gte: getMinBookableDate() },
        tour: { deletedAt: null, status: TourStatus.PUBLISHED },
      },
      include: {
        tour: {
          include: {
            destination: { select: { id: true, name: true, nameEn: true, travelScope: true, countryCode: true } },
          },
        },
      },
      orderBy: [
        { flashSaleEndsAt: { sort: 'asc', nulls: 'last' } },
        { departureDate: 'asc' },
      ],
    });

    const badgeMapVi: Record<string, string> = { FLASH_SALE: 'FLASH SALE', EARLY_BIRD: 'DAT SOM', LAST_MINUTE: 'GIO CHOT' };
    const badgeMapEn: Record<string, string> = { FLASH_SALE: 'FLASH SALE', EARLY_BIRD: 'EARLY BIRD', LAST_MINUTE: 'LAST MINUTE' };
    const badgeMap = locale === 'en' ? badgeMapEn : badgeMapVi;
    const categoryMap: Record<string, string> = { FLASH_SALE: 'flash', EARLY_BIRD: 'early', LAST_MINUTE: 'lastminute' };

    return departures.map((dep) => {
      const tour = dep.tour;
      const salePrice = dep.price ?? tour.price;
      const originalPrice = tour.price;
      const discountPct = originalPrice > 0 ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;
      const maxSeats = dep.maxSeats ?? null;
      const bookedPercent = maxSeats && maxSeats > 0
        ? Math.min(99, Math.round(((maxSeats - dep.availableSeats) / maxSeats) * 100))
        : null;
      const cat = dep.category ?? (saleCategories.includes(dep.note ?? '') ? dep.note : null) ?? 'FLASH_SALE';

      return {
        id: dep.id, tourId: tour.id,
        name: locale === 'en' ? tour.nameEn?.trim() || toEnglishNameFallback(tour.name, tour.name) : tour.name,
        image: tour.imageUrl,
        badge: discountPct > 0 ? `${badgeMap[cat] ?? cat} -${discountPct}%` : (badgeMap[cat] ?? cat),
        category: categoryMap[cat] ?? 'flash',
        rating: tour.averageRating,
        duration: locale === 'en' ? tour.durationEn?.trim() || toEnglishNameFallback(tour.duration, tour.duration) : tour.duration,
        newPrice: salePrice, oldPrice: originalPrice, discountPct,
        availableSeats: dep.availableSeats, maxSeats, bookedPercent,
        flashSaleEndsAt: dep.flashSaleEndsAt?.toISOString() ?? null,
        departureDate: dep.departureDate,
        destination: locale === 'en'
          ? tour.destination?.nameEn?.trim() || toEnglishNameFallback(tour.destination?.name, tour.destination?.name ?? '')
          : tour.destination?.name ?? '',
      };
    });
  }
}
