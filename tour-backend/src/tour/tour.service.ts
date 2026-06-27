import { Injectable } from '@nestjs/common';
import { Prisma, TourStatus } from '@prisma/client';
import { CreateTourDto } from './dto/create-tour.dto';
import { FilterTourDto } from './dto/filter-tour.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TourPermissionService } from './tour-permission.service';
import { TourWorkflowService } from './tour-workflow.service';
import { TourContentService } from './tour-content.service';
import { TourQueryService } from './tour-query.service';
import { localizeTour, normalizeLocale } from './localization';
import {
  getTomorrow,
  getMinBookableDate,
  normalizeSearchText,
  parseRatingBuckets,
  appendAndFilter,
  requirePublishableTour,
  parseTravelScope,
} from './tour-helpers';
import { isSaleDeparture, SALE_DEPARTURE_CATEGORIES } from './promotion-rules';

const DRAFT_DESTINATION_NAME = 'Chưa xác định';

@Injectable()
export class TourService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tourPermission: TourPermissionService,
    private readonly workflowService: TourWorkflowService,
    private readonly contentService: TourContentService,
    private readonly queryService: TourQueryService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────

  async resolveDestinationId(destinationId?: number) {
    if (destinationId) return destinationId;
    const destination = await this.prisma.destination.upsert({
      where: { name: DRAFT_DESTINATION_NAME },
      update: {},
      create: { name: DRAFT_DESTINATION_NAME },
    });
    return destination.id;
  }

  async create(
    createTourDto: CreateTourDto,
    creatorId?: number,
    creatorRole?: string,
  ) {
    const { destinationId, status: dtoStatus } = createTourDto;

    const isAdminRole =
      creatorRole === 'SUPER_ADMIN' || creatorRole === 'ADMIN';
    const finalStatus: TourStatus = isAdminRole
      ? (dtoStatus ?? TourStatus.DRAFT)
      : TourStatus.DRAFT;

    if (
      finalStatus === TourStatus.PUBLISHED ||
      finalStatus === TourStatus.PENDING_REVIEW
    ) {
      requirePublishableTour(createTourDto);
    }

    const resolvedDestinationId =
      await this.resolveDestinationId(destinationId);

    return this.prisma.tour.create({
      data: {
        name: createTourDto.name?.trim() ?? '',
        nameEn: createTourDto.nameEn?.trim() || null,
        description: createTourDto.description?.trim() ?? '',
        descriptionEn: createTourDto.descriptionEn?.trim() || null,
        price: createTourDto.price ?? 0,
        destination: { connect: { id: resolvedDestinationId } },
        startDate: createTourDto.startDate ?? getTomorrow(),
        duration: createTourDto.duration?.trim() || 'Chưa xác định',
        durationEn: createTourDto.durationEn?.trim() || null,
        availableSeats: createTourDto.availableSeats ?? 0,
        imageUrl: createTourDto.imageUrl?.trim() || null,
        tourType: createTourDto.tourType?.trim() || 'Luxury Retreat',
        departurePoint: createTourDto.departurePoint?.trim() || null,
        departurePointEn: createTourDto.departurePointEn?.trim() || null,
        isFeatured: createTourDto.isFeatured ?? false,
        status: finalStatus,
        publishedAt: finalStatus === TourStatus.PUBLISHED ? new Date() : null,
        ...(creatorId && { createdBy: { connect: { id: creatorId } } }),
      },
    });
  }

  // ── FindAll ───────────────────────────────────────────────────────────

  async findAll(
    query: FilterTourDto = {},
    requesterId?: number,
    requesterRole?: string,
    localeInput?: string,
  ) {
    const {
      dest,
      destinationId,
      travelScope: travelScopeInput,
      minPrice,
      maxPrice,
      date,
      departure,
      ratings,
      minRating,
      types,
      sortBy,
      status,
      startDateFrom,
      startDateTo,
      featured,
      hasSale,
      page = '1',
      limit = '10',
    } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const locale = normalizeLocale(localeInput);

    const where: Prisma.TourWhereInput = { deletedAt: null };
    const travelScope = parseTravelScope(travelScopeInput);

    // Visibility
    if (requesterRole === 'STAFF' && requesterId) {
      if (status && Object.values(TourStatus).includes(status as TourStatus)) {
        where.status = status as TourStatus;
        if (status !== TourStatus.PUBLISHED) {
          where.createdById = requesterId;
        }
      } else {
        where.OR = [
          { status: TourStatus.PUBLISHED },
          { createdById: requesterId },
        ];
      }
    } else if (requesterRole !== 'SUPER_ADMIN' && requesterRole !== 'ADMIN') {
      where.status = TourStatus.PUBLISHED;
      // Lưu ý: giới hạn date được xử lý ở khối filter thống nhất bên dưới
    } else if (
      status &&
      Object.values(TourStatus).includes(status as TourStatus)
    ) {
      where.status = status as TourStatus;
    }

    if (destinationId) {
      appendAndFilter(where, { destinationId: parseInt(destinationId, 10) });
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (hasSale === 'true') {
      const now = new Date();
      appendAndFilter(where, {
        departures: {
          some: {
            isActive: true,
            departureDate: { gte: getMinBookableDate() },
            AND: [
              {
                OR: [
                  { category: { in: [...SALE_DEPARTURE_CATEGORIES] } },
                  {
                    AND: [
                      { category: null },
                      { note: { in: [...SALE_DEPARTURE_CATEGORIES] } },
                    ],
                  },
                ],
              },
              { OR: [{ flashSaleEndsAt: null }, { flashSaleEndsAt: { gt: now } }] },
            ],
          },
        },
      });
    }

    if (dest) {
      const normalizedDest = normalizeSearchText(dest);
      // Quét accent-insensitive chỉ trong phạm vi tour người dùng được thấy
      // (visibility đã dựng ở `where`) và đúng travelScope nếu có. Kết quả không
      // đổi vì các id khớp sẽ được AND lại với `where`, nhưng giảm mạnh số dòng
      // nạp vào RAM (với khách public: chỉ tour PUBLISHED thay vì toàn bảng).
      const tourScanWhere: Prisma.TourWhereInput = {
        ...where,
        ...(travelScope ? { destination: { travelScope } } : {}),
      };
      const destinationScanWhere: Prisma.DestinationWhereInput = travelScope
        ? { travelScope }
        : {};
      const [matchingDestinations, matchingTours] =
        normalizedDest.length > 0
          ? await Promise.all([
              this.prisma.destination.findMany({
                where: destinationScanWhere,
                select: {
                  id: true,
                  name: true,
                  nameEn: true,
                  region: true,
                  regionEn: true,
                },
              }),
              this.prisma.tour.findMany({
                where: tourScanWhere,
                select: {
                  id: true,
                  name: true,
                  nameEn: true,
                  destination: {
                    select: {
                      name: true,
                      nameEn: true,
                      region: true,
                      regionEn: true,
                    },
                  },
                },
              }),
            ])
          : [[], []];
      const matchingDestinationIds = matchingDestinations
        .filter((destination) =>
          normalizeSearchText(
            `${destination.name} ${destination.nameEn ?? ''} ${destination.region ?? ''} ${destination.regionEn ?? ''}`,
          ).includes(normalizedDest),
        )
        .map((destination) => destination.id);
      const matchingTourIds = matchingTours
        .filter((tour) =>
          normalizeSearchText(
            `${tour.name} ${tour.nameEn ?? ''} ${tour.destination?.name ?? ''} ${tour.destination?.nameEn ?? ''} ${tour.destination?.region ?? ''} ${tour.destination?.regionEn ?? ''}`,
          ).includes(normalizedDest),
        )
        .map((tour) => tour.id);
      const searchFilter: Prisma.TourWhereInput = {
        OR: [
          { name: { contains: dest, mode: 'insensitive' } },
          { nameEn: { contains: dest, mode: 'insensitive' } },
          { destination: { name: { contains: dest, mode: 'insensitive' } } },
          { destination: { nameEn: { contains: dest, mode: 'insensitive' } } },
          ...(matchingDestinationIds.length > 0
            ? [{ destinationId: { in: matchingDestinationIds } }]
            : []),
          ...(matchingTourIds.length > 0
            ? [{ id: { in: matchingTourIds } }]
            : []),
        ],
      };
      where.AND = Array.isArray(where.AND)
        ? [...where.AND, searchFilter]
        : where.AND
          ? [where.AND, searchFilter]
          : [searchFilter];
    }

    if (travelScope) {
      const scopeFilter: Prisma.TourWhereInput = {
        destination: { travelScope },
      };
      where.AND = Array.isArray(where.AND)
        ? [...where.AND, scopeFilter]
        : where.AND
          ? [where.AND, scopeFilter]
          : [scopeFilter];
    }

    if (minPrice || maxPrice) {
      where.price = {
        ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
        ...(maxPrice && maxPrice !== 'unlimited'
          ? { lte: parseFloat(maxPrice) }
          : {}),
      };
    }

    // ══ Date filter: hỗ trợ cả tour dùng startDate lẫn TourDeparture ══
    // Công chúản: hiện tour khi startDate >= date OR có departure tương lai
    {
      const isPublicUser =
        requesterRole !== 'SUPER_ADMIN' &&
        requesterRole !== 'ADMIN' &&
        requesterRole !== 'STAFF';
      const effectiveDate = date
        ? new Date(date)
        : isPublicUser
          ? new Date()
          : null;
      if (effectiveDate) {
        appendAndFilter(where, {
          OR: [
            { startDate: { gte: effectiveDate } },
            {
              departures: {
                some: { isActive: true, departureDate: { gte: effectiveDate } },
              },
            },
          ],
        });
      }
    }

    // ══ Admin date range filter: startDateFrom / startDateTo ══
    if (startDateFrom || startDateTo) {
      const dateFilter: Prisma.TourWhereInput = {
        startDate: {
          ...(startDateFrom ? { gte: new Date(startDateFrom) } : {}),
          ...(startDateTo
            ? { lte: new Date(new Date(startDateTo).setHours(23, 59, 59, 999)) }
            : {}),
        },
      };
      appendAndFilter(where, dateFilter);
    }

    // ══ Điểm khởi hành filter ══
    if (departure?.trim()) {
      appendAndFilter(where, {
        OR: [
          {
            departurePoint: { contains: departure.trim(), mode: 'insensitive' },
          },
          {
            departurePointEn: {
              contains: departure.trim(),
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    // Legacy: exact bucket ratings (e.g. ratings=4,5)
    if (ratings) {
      const ratingBuckets = parseRatingBuckets(ratings);
      const ratingFilters = ratingBuckets.map((rating) => ({
        AND: [
          { reviews: { some: { isHidden: false } } },
          {
            averageRating:
              rating === 5 ? { gte: 5 } : { gte: rating, lt: rating + 1 },
          },
        ],
      }));
      appendAndFilter(
        where,
        ratingFilters.length === 1 ? ratingFilters[0] : { OR: ratingFilters },
      );
    }

    // minRating: lọc tour có averageRating >= threshold (vd: 4.5, 4.0, 3.0)
    if (minRating) {
      const threshold = parseFloat(minRating);
      if (!isNaN(threshold) && threshold > 0) {
        appendAndFilter(where, {
          averageRating: { gte: threshold },
          reviews: { some: { isHidden: false } },
        });
      }
    }

    if (types) {
      where.tourType = { in: types.split(',') };
    }

    let orderBy: Prisma.TourOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy === 'priceLowHigh') orderBy = { price: 'asc' };
    else if (sortBy === 'priceHighLow') orderBy = { price: 'desc' };
    else if (sortBy === 'recommended') orderBy = { averageRating: 'desc' };
    else if (sortBy === 'startDateAsc') orderBy = { startDate: 'asc' };
    else if (sortBy === 'startDateDesc') orderBy = { startDate: 'desc' };
    else if (sortBy === 'ratingDesc') orderBy = { averageRating: 'desc' };
    else if (sortBy === 'seatsAsc') orderBy = { availableSeats: 'asc' };

    const [tours, totalItems] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          destination: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              region: true,
              regionEn: true,
              travelScope: true,
              countryCode: true,
            },
          },
          departures: {
            select: { price: true, note: true, noteEn: true, category: true, flashSaleEndsAt: true },
            where: {
              isActive: true,
              departureDate: { gte: getMinBookableDate() },
            },
          },
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { reviews: { where: { isHidden: false } } } },
          bookings: {
            select: { numberOfPeople: true },
            where: {
              status: { in: ['CONFIRMED', 'PENDING'] },
              deletedAt: null,
            },
          },
        },
      }),
      this.prisma.tour.count({ where }),
    ]);

    return {
      data: tours.map((tour) => {
        const localizedTour = localizeTour(tour, locale);
        const reviewCount = localizedTour._count?.reviews ?? 0;
        const bookedSeats = (tour.bookings ?? []).reduce(
          (sum: number, b: { numberOfPeople: number }) =>
            sum + b.numberOfPeople,
          0,
        );
        const totalSeats = tour.availableSeats + bookedSeats;
        const hasSaleFlag = (tour.departures ?? []).some((dep) =>
          isSaleDeparture(dep, { regularPrice: tour.price }),
        );
        return {
          ...localizedTour,
          reviewCount,
          averageRating: reviewCount > 0 ? localizedTour.averageRating : 0,
          bookedSeats,
          totalSeats,
          hasSale: hasSaleFlag,
        };
      }),
      meta: {
        totalItems,
        itemCount: tours.length,
        itemsPerPage: limitNum,
        totalPages: Math.ceil(totalItems / limitNum),
        currentPage: pageNum,
      },
    };
  }

  // Find/Update/Remove — delegated to TourQueryService
  async findOne(
    id: number,
    requesterId?: number,
    requesterRole?: string,
    localeInput?: string,
  ) {
    return this.queryService.findOne(
      id,
      requesterId,
      requesterRole,
      localeInput,
    );
  }
  async update(
    id: number,
    updateTourDto: import('./dto/update-tour.dto').UpdateTourDto,
    requesterId?: number,
    requesterRole?: string,
  ) {
    return this.queryService.update(
      id,
      updateTourDto,
      requesterId,
      requesterRole,
    );
  }
  async remove(id: number, requesterId?: number, requesterRole?: string) {
    return this.queryService.remove(id, requesterId, requesterRole);
  }

  // ─── Workflow ─── delegated to TourWorkflowService ─────────────────────────
  async submitForReview(id: number, requesterId: number) {
    return this.workflowService.submitForReview(id, requesterId);
  }
  async bulkSubmitForReview(ids: number[], requesterId: number) {
    return this.workflowService.bulkSubmitForReview(ids, requesterId);
  }
  async reviewTour(
    id: number,
    reviewerId: number,
    action: 'approve' | 'reject',
    note?: string,
  ) {
    return this.workflowService.reviewTour(id, reviewerId, action, note);
  }
  async publishTour(id: number, publisherId: number) {
    return this.workflowService.publishTour(id, publisherId);
  }
  async getPendingTours() {
    return this.workflowService.getPendingTours();
  }

  // ─── Content ─── delegated to TourContentService ────────────────────────────
  async addGalleryImages(
    tourId: number,
    urls: string[],
    requesterId?: number,
    requesterRole?: string,
  ) {
    return this.contentService.addGalleryImages(
      tourId,
      urls,
      requesterId,
      requesterRole,
    );
  }
  async removeGalleryImage(
    tourId: number,
    imageId: number,
    requesterId?: number,
    requesterRole?: string,
  ) {
    return this.contentService.removeGalleryImage(
      tourId,
      imageId,
      requesterId,
      requesterRole,
    );
  }
  async upsertHighlights(
    tourId: number,
    highlights: Parameters<TourContentService['upsertHighlights']>[1],
    requesterId?: number,
    requesterRole?: string,
  ) {
    return this.contentService.upsertHighlights(
      tourId,
      highlights,
      requesterId,
      requesterRole,
    );
  }
  async upsertFaqs(
    tourId: number,
    faqs: Parameters<TourContentService['upsertFaqs']>[1],
    requesterId?: number,
    requesterRole?: string,
  ) {
    return this.contentService.upsertFaqs(
      tourId,
      faqs,
      requesterId,
      requesterRole,
    );
  }
  async upsertItinerary(
    tourId: number,
    itinerary: Parameters<TourContentService['upsertItinerary']>[1],
    requesterId?: number,
    requesterRole?: string,
  ) {
    return this.contentService.upsertItinerary(
      tourId,
      itinerary,
      requesterId,
      requesterRole,
    );
  }
  async updateItineraryDay(
    tourId: number,
    dayId: number,
    data: Parameters<TourContentService['updateItineraryDay']>[2],
    requesterId?: number,
    requesterRole?: string,
  ) {
    return this.contentService.updateItineraryDay(
      tourId,
      dayId,
      data,
      requesterId,
      requesterRole,
    );
  }

  // ─── Query ─── delegated to TourQueryService ─────────────────────────────────
  async getAdminStats(requesterId?: number, requesterRole?: string) {
    return this.queryService.getAdminStats(requesterId, requesterRole);
  }
  async getTrashedTours(
    page = 1,
    limit = 10,
    query: { search?: string; status?: string; deletable?: string } = {},
  ) {
    return this.queryService.getTrashedTours(page, limit, query);
  }
  async restoreTour(id: number) {
    return this.queryService.restoreTour(id);
  }
  async permanentDelete(id: number) {
    return this.queryService.permanentDelete(id);
  }
  async bulkHide(ids: number[], requesterId?: number, requesterRole?: string) {
    return this.queryService.bulkHide(ids, requesterId, requesterRole);
  }
  async bulkRestoreTours(ids: number[]) {
    return this.queryService.bulkRestoreTours(ids);
  }
  async bulkPermanentDelete(ids: number[]) {
    return this.queryService.bulkPermanentDelete(ids);
  }
  async getRatingStats(tourId: number) {
    return this.queryService.getRatingStats(tourId);
  }
  async getSaleDeals(localeInput?: string) {
    return this.queryService.getSaleDeals(localeInput);
  }
}
