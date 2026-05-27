import { Injectable } from '@nestjs/common';
import { Prisma, TourStatus } from '@prisma/client';
import { CreateTourDto } from './dto/create-tour.dto';
import { FilterTourDto } from './dto/filter-tour.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TourPermissionService } from './tour-permission.service';
import { TourWorkflowService } from './tour-workflow.service';
import { TourContentService } from './tour-content.service';
import { TourQueryService } from './tour-query.service';
import { localizeTour, normalizeLocale } from './tour-localization';
import {
  getTomorrow,
  getMinBookableDate,
  normalizeSearchText,
  parseRatingBuckets,
  appendAndFilter,
  requirePublishableTour,
  parseTravelScope,
} from './tour-helpers';


const DRAFT_DESTINATION_NAME = 'Chua xac dinh';

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

    // Admin/SuperAdmin tạo thẳng PUBLISHED; Staff tạo DRAFT (bản nháp — tự chỉnh sửa trước khi gửi duyệt)
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
        duration: createTourDto.duration?.trim() || 'Chua xac dinh',
        durationEn: createTourDto.durationEn?.trim() || null,
        availableSeats: createTourDto.availableSeats ?? 0,
        imageUrl: createTourDto.imageUrl?.trim() || null,
        tourType: createTourDto.tourType?.trim() || 'Luxury Retreat',
        departurePoint: createTourDto.departurePoint?.trim() || null,
        departurePointEn: createTourDto.departurePointEn?.trim() || null,
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
      travelScope: travelScopeInput,
      minPrice,
      maxPrice,
      date,
      ratings,
      types,
      sortBy,
      status,
      page = '1',
      limit = '10',
    } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const locale = normalizeLocale(localeInput);

    const where: Prisma.TourWhereInput = { deletedAt: null };
    const travelScope = parseTravelScope(travelScopeInput);

    // Visibility: Staff chỉ thấy tour của mình; Admin thấy tất cả; Public chỉ thấy PUBLISHED
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
      // Public request - only PUBLISHED and upcoming tours
      where.status = TourStatus.PUBLISHED;
      where.startDate = { gte: new Date() };
    } else if (
      status &&
      Object.values(TourStatus).includes(status as TourStatus)
    ) {
      // Admin can filter by specific status
      where.status = status as TourStatus;
    }
    // Admin/SuperAdmin without status param: see all

    if (dest) {
      const normalizedDest = normalizeSearchText(dest);
      const [matchingDestinations, matchingTours] =
        normalizedDest.length > 0
          ? await Promise.all([
              this.prisma.destination.findMany({
                select: { id: true, name: true, nameEn: true, region: true, regionEn: true },
              }),
              this.prisma.tour.findMany({
                where: { deletedAt: null },
                select: {
                  id: true,
                  name: true,
                  nameEn: true,
                  destination: { select: { name: true, nameEn: true, region: true, regionEn: true } },
                },
              }),
            ])
          : [[], []];
      const matchingDestinationIds = matchingDestinations
        .filter((destination) =>
          normalizeSearchText(`${destination.name} ${destination.nameEn ?? ''} ${destination.region ?? ''} ${destination.regionEn ?? ''}`).includes(normalizedDest),
        )
        .map((destination) => destination.id);
      const matchingTourIds = matchingTours
        .filter((tour) =>
          normalizeSearchText(`${tour.name} ${tour.nameEn ?? ''} ${tour.destination?.name ?? ''} ${tour.destination?.nameEn ?? ''} ${tour.destination?.region ?? ''} ${tour.destination?.regionEn ?? ''}`).includes(normalizedDest),
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
          ...(matchingTourIds.length > 0 ? [{ id: { in: matchingTourIds } }] : []),
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

    if (date) {
      where.startDate = { gte: new Date(date) };
    }

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

    if (types) {
      const typeArr = types.split(',');
      where.tourType = { in: typeArr };
    }

    let orderBy: Prisma.TourOrderByWithRelationInput = { id: 'asc' };
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
          destination: { select: { id: true, name: true, nameEn: true, region: true, regionEn: true, travelScope: true, countryCode: true } },
          departures: {
            select: { price: true, note: true, noteEn: true },
            where: {
              isActive: true,
              departureDate: { gte: getMinBookableDate() },
            },
          },
          createdBy: { select: { id: true, fullName: true } },
          _count: {
            select: {
              reviews: { where: { isHidden: false } },
            },
          },
        },
      }),
      this.prisma.tour.count({ where }),
    ]);

    return {
      data: tours.map((tour) => localizeTour(tour, locale)),
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
  async findOne(id: number, requesterId?: number, requesterRole?: string, localeInput?: string) {
    return this.queryService.findOne(id, requesterId, requesterRole, localeInput);
  }
  async update(id: number, updateTourDto: import('./dto/update-tour.dto').UpdateTourDto, requesterId?: number, requesterRole?: string) {
    return this.queryService.update(id, updateTourDto, requesterId, requesterRole);
  }
  async remove(id: number, requesterId?: number, requesterRole?: string) {
    return this.queryService.remove(id, requesterId, requesterRole);
  }


  // ─── Workflow ─── delegated to TourWorkflowService ─────────────────────────
  async submitForReview(id: number, requesterId: number) { return this.workflowService.submitForReview(id, requesterId); }
  async reviewTour(id: number, reviewerId: number, action: 'approve' | 'reject', note?: string) { return this.workflowService.reviewTour(id, reviewerId, action, note); }
  async publishTour(id: number, publisherId: number) { return this.workflowService.publishTour(id, publisherId); }
  async getPendingTours() { return this.workflowService.getPendingTours(); }

  // ─── Content ─── delegated to TourContentService ────────────────────────────
  async addGalleryImages(tourId: number, urls: string[], requesterId?: number, requesterRole?: string) { return this.contentService.addGalleryImages(tourId, urls, requesterId, requesterRole); }
  async removeGalleryImage(tourId: number, imageId: number, requesterId?: number, requesterRole?: string) { return this.contentService.removeGalleryImage(tourId, imageId, requesterId, requesterRole); }
  async upsertHighlights(tourId: number, highlights: any[], requesterId?: number, requesterRole?: string) { return this.contentService.upsertHighlights(tourId, highlights, requesterId, requesterRole); }
  async upsertFaqs(tourId: number, faqs: any[], requesterId?: number, requesterRole?: string) { return this.contentService.upsertFaqs(tourId, faqs, requesterId, requesterRole); }
  async updateItineraryDay(tourId: number, dayId: number, data: any, requesterId?: number, requesterRole?: string) { return this.contentService.updateItineraryDay(tourId, dayId, data, requesterId, requesterRole); }

  // ─── Query ─── delegated to TourQueryService ─────────────────────────────────
  async getAdminStats(requesterId?: number, requesterRole?: string) { return this.queryService.getAdminStats(requesterId, requesterRole); }
  async getTrashedTours(page = 1, limit = 10, query: { search?: string; status?: string; deletable?: string } = {}) { return this.queryService.getTrashedTours(page, limit, query); }
  async restoreTour(id: number) { return this.queryService.restoreTour(id); }
  async permanentDelete(id: number) { return this.queryService.permanentDelete(id); }
  async bulkRestoreTours(ids: number[]) { return this.queryService.bulkRestoreTours(ids); }
  async bulkPermanentDelete(ids: number[]) { return this.queryService.bulkPermanentDelete(ids); }
  async getRatingStats(tourId: number) { return this.queryService.getRatingStats(tourId); }
  async getSaleDeals(localeInput?: string) { return this.queryService.getSaleDeals(localeInput); }
}
