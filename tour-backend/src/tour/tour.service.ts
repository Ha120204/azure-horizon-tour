import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, TourStatus, TravelScope } from '@prisma/client';
import { CreateTourDto } from './dto/create-tour.dto';
import { FilterTourDto } from './dto/filter-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TourPermissionService } from './tour-permission.service';
import { localizeTour, normalizeLocale, toEnglishNameFallback } from './tour-localization';

const DRAFT_DESTINATION_NAME = 'Chưa xác định';

const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
};

const getMinBookableDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
};

const parseTravelScope = (input?: string): TravelScope | undefined => {
  if (!input) return undefined;
  if (input === TravelScope.DOMESTIC || input === TravelScope.INTERNATIONAL) {
    return input;
  }
  throw new BadRequestException('travelScope khong hop le');
};

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const parseRatingBuckets = (input?: string): number[] => {
  if (!input) return [];

  const ratings = input
    .split(',')
    .map((rating) => Number(rating.trim()))
    .filter((rating) => !Number.isNaN(rating));

  if (
    ratings.length === 0 ||
    ratings.some((rating) => !Number.isInteger(rating) || rating < 1 || rating > 5)
  ) {
    throw new BadRequestException('ratings khong hop le');
  }

  return Array.from(new Set(ratings));
};

const appendAndFilter = (
  where: Prisma.TourWhereInput,
  filter: Prisma.TourWhereInput,
) => {
  where.AND = Array.isArray(where.AND)
    ? [...where.AND, filter]
    : where.AND
      ? [where.AND, filter]
      : [filter];
};

type PublishableTourFields = {
  name?: string | null;
  description?: string | null;
  price?: number | null;
  destinationId?: number | null;
  destination?: { name?: string | null } | null;
  startDate?: Date | string | null;
  duration?: string | null;
  availableSeats?: number | null;
  departures?: Array<{
    departureDate?: Date | null;
    availableSeats?: number | null;
    isActive?: boolean | null;
  }>;
};

const hasText = (value?: string | null) => Boolean(value?.trim());

const requirePublishableTour = (
  tour: PublishableTourFields,
  options: { requireDepartures?: boolean } = {},
) => {
  const errors: string[] = [];
  if (!hasText(tour.name)) errors.push('Ten tour');
  if (!hasText(tour.description)) errors.push('Mo ta');
  if (tour.price == null || Number(tour.price) <= 0) errors.push('Gia');
  if (!tour.destinationId) errors.push('Diem den');
  if (tour.destination?.name === DRAFT_DESTINATION_NAME)
    errors.push('Diem den');
  if (!hasText(tour.duration)) errors.push('Thoi luong');
  if (tour.availableSeats == null || Number(tour.availableSeats) < 1)
    errors.push('So ghe');

  const startDate = tour.startDate ? new Date(tour.startDate) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    errors.push('Ngay khoi hanh');
  }

  if (options.requireDepartures) {
    const validDepartures = (tour.departures ?? []).filter(
      (departure) =>
        departure.isActive !== false &&
        departure.departureDate &&
        Number(departure.availableSeats ?? 0) > 0,
    );
    if (validDepartures.length === 0) errors.push('It nhat 1 chuyen khoi hanh');
  }

  if (errors.length > 0) {
    throw new BadRequestException(
      `Vui long hoan thien thong tin truoc khi gui duyet: ${[...new Set(errors)].join(', ')}`,
    );
  }
};

const isAdminLikeRole = (role?: string) =>
  role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'STAFF';

const sanitizePublicTourDetail = <T extends Record<string, unknown>>(
  tour: T,
) => {
  const {
    createdBy,
    reviewedBy,
    createdById,
    reviewedById,
    reviewNote,
    deletedAt,
    ...publicTour
  } = tour;
  void createdBy;
  void reviewedBy;
  void createdById;
  void reviewedById;
  void reviewNote;
  void deletedAt;
  return publicTour;
};

@Injectable()
export class TourService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tourPermission: TourPermissionService,
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
      // Public request — chỉ PUBLISHED và chưa diễn ra
      where.status = TourStatus.PUBLISHED;
      where.startDate = { gte: new Date() };
    } else if (
      status &&
      Object.values(TourStatus).includes(status as TourStatus)
    ) {
      // Admin có thể filter theo status cụ thể
      where.status = status as TourStatus;
    }
    // Admin/SuperAdmin không có status param: thấy tất cả

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

  // ── FindOne ───────────────────────────────────────────────────────────

  async getAdminStats(requesterId?: number, requesterRole?: string) {
    const isAdminRole =
      requesterRole === 'SUPER_ADMIN' || requesterRole === 'ADMIN';

    const visibleWhere: Prisma.TourWhereInput = { deletedAt: null };
    if (requesterRole === 'STAFF' && requesterId) {
      visibleWhere.OR = [
        { status: TourStatus.PUBLISHED },
        { createdById: requesterId },
      ];
    } else if (!isAdminRole) {
      visibleWhere.status = TourStatus.PUBLISHED;
    }

    const workflowWhere = (status: TourStatus): Prisma.TourWhereInput => ({
      deletedAt: null,
      status,
      ...(requesterRole === 'STAFF' && requesterId
        ? { createdById: requesterId }
        : {}),
    });

    const publishedWhere: Prisma.TourWhereInput = {
      deletedAt: null,
      status: TourStatus.PUBLISHED,
    };
    const futurePublishedWhere: Prisma.TourWhereInput = {
      ...publishedWhere,
      startDate: { gte: new Date() },
    };

    const [
      totalVisible,
      total,
      published,
      draft,
      pending,
      rejected,
      completed,
      seatsAgg,
      priceAgg,
    ] = await Promise.all([
      this.prisma.tour.count({ where: visibleWhere }),
      this.prisma.tour.count({ where: { deletedAt: null } }),
      this.prisma.tour.count({ where: publishedWhere }),
      this.prisma.tour.count({ where: workflowWhere(TourStatus.DRAFT) }),
      this.prisma.tour.count({
        where: workflowWhere(TourStatus.PENDING_REVIEW),
      }),
      this.prisma.tour.count({ where: workflowWhere(TourStatus.REJECTED) }),
      this.prisma.tour.count({ where: workflowWhere(TourStatus.COMPLETED) }),
      this.prisma.tour.aggregate({
        where: futurePublishedWhere,
        _sum: { availableSeats: true },
      }),
      this.prisma.tour.aggregate({
        where: publishedWhere,
        _avg: { price: true },
      }),
    ]);

    return {
      totalVisible,
      total,
      published,
      draft,
      pending,
      rejected,
      completed,
      active: published,
      totalSeats: Number(seatsAgg._sum.availableSeats ?? 0),
      avgPrice: Number(priceAgg._avg.price ?? 0),
    };
  }

  async findOne(id: number, requesterId?: number, requesterRole?: string, localeInput?: string) {
    const locale = normalizeLocale(localeInput);
    const where: Prisma.TourWhereInput = { id, deletedAt: null };

    if (requesterRole === 'STAFF' && requesterId) {
      where.OR = [
        { status: TourStatus.PUBLISHED },
        { createdById: requesterId },
      ];
    } else if (requesterRole !== 'SUPER_ADMIN' && requesterRole !== 'ADMIN') {
      where.status = TourStatus.PUBLISHED;
      where.OR = [
        { startDate: { gte: getMinBookableDate() } },
        {
          departures: {
            some: {
              isActive: true,
              departureDate: { gte: getMinBookableDate() },
            },
          },
        },
      ];
    }

    const tour = await this.prisma.tour.findFirst({
      where,
      include: {
        destination: true,
        itinerary: { orderBy: { dayNumber: 'asc' } },
        packages: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        departures: {
          where: {
            isActive: true,
            departureDate: { gte: getMinBookableDate() },
          },
          orderBy: [{ sortOrder: 'asc' }, { departureDate: 'asc' }],
        },
        images: { orderBy: { sortOrder: 'asc' } },
        highlights: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          where: { isHidden: false },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { fullName: true, avatarUrl: true } },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!tour) {
      throw new NotFoundException(`Tour with ID ${id} not found`);
    }
    const localizedTour = localizeTour(tour, locale);
    return isAdminLikeRole(requesterRole)
      ? localizedTour
      : sanitizePublicTourDetail(localizedTour);
  }

  // ── Update ────────────────────────────────────────────────────────────

  async update(
    id: number,
    updateTourDto: UpdateTourDto,
    requesterId?: number,
    requesterRole?: string,
  ) {
    const tour = await this.prisma.tour.findUnique({
      where: { id, deletedAt: null },
    });
    if (!tour) throw new NotFoundException(`Tour with ID ${id} not found`);

    const isAdminRole =
      requesterRole === 'SUPER_ADMIN' || requesterRole === 'ADMIN';
    if (!isAdminRole) {
      // Staff: chỉ được sửa tour của chính mình & đang ở DRAFT hoặc REJECTED
      if (tour.createdById !== requesterId) {
        throw new ForbiddenException('Bạn không có quyền chỉnh sửa tour này');
      }
      if (
        tour.status !== TourStatus.DRAFT &&
        tour.status !== TourStatus.REJECTED
      ) {
        throw new ForbiddenException(
          'Chỉ có thể chỉnh sửa tour ở trạng thái Bản nháp hoặc Bị từ chối',
        );
      }
    }

    const { destinationId, status, ...rest } = updateTourDto;

    // Nếu Staff sửa tour bị REJECTED → giữ nguyên REJECTED cho đến khi gửi duyệt lại
    // (submitForReview mới là chỗ chuyển sang PENDING_REVIEW)

    return this.prisma.tour.update({
      where: { id },
      data: {
        ...rest,
        ...(rest.name !== undefined && { name: rest.name?.trim() ?? '' }),
        ...(rest.nameEn !== undefined && { nameEn: rest.nameEn?.trim() || null }),
        ...(rest.description !== undefined && {
          description: rest.description?.trim() ?? '',
        }),
        ...(rest.descriptionEn !== undefined && {
          descriptionEn: rest.descriptionEn?.trim() || null,
        }),
        ...(rest.duration !== undefined && {
          duration: rest.duration?.trim() || 'Chua xac dinh',
        }),
        ...(rest.durationEn !== undefined && {
          durationEn: rest.durationEn?.trim() || null,
        }),
        ...(rest.imageUrl !== undefined && {
          imageUrl: rest.imageUrl?.trim() || null,
        }),
        ...(rest.tourType !== undefined && {
          tourType: rest.tourType?.trim() || 'Luxury Retreat',
        }),
        ...(rest.departurePoint !== undefined && {
          departurePoint: rest.departurePoint?.trim() || null,
        }),
        ...(rest.departurePointEn !== undefined && {
          departurePointEn: rest.departurePointEn?.trim() || null,
        }),
        ...(isAdminRole &&
          status !== undefined && {
            status,
            publishedAt:
              status === TourStatus.PUBLISHED
                ? (tour.publishedAt ?? new Date())
                : null,
          }),
        ...(destinationId !== undefined && {
          destination: { connect: { id: destinationId } },
        }),
      },
    });
  }

  // ── Remove ────────────────────────────────────────────────────────────

  async remove(id: number, requesterId?: number, requesterRole?: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { id, deletedAt: null },
    });
    if (!tour) throw new NotFoundException(`Tour with ID ${id} not found`);

    const isAdminRole =
      requesterRole === 'SUPER_ADMIN' || requesterRole === 'ADMIN';
    if (!isAdminRole) {
      if (tour.createdById !== requesterId) {
        throw new ForbiddenException('Bạn không có quyền xóa bản nháp này');
      }
      if (
        tour.status !== TourStatus.DRAFT &&
        tour.status !== TourStatus.REJECTED
      ) {
        throw new BadRequestException(
          'Chỉ có thể xóa tour ở trạng thái Bản nháp hoặc Bị từ chối',
        );
      }
    }

    return this.prisma.tour.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Trash: Get / Restore / Permanent Delete ────────────────────────────────

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

    if (
      query.status &&
      Object.values(TourStatus).includes(query.status as TourStatus)
    ) {
      where.status = query.status as TourStatus;
    }

    if (query.deletable === 'true') {
      where.bookings = { none: {} };
    } else if (query.deletable === 'false') {
      where.bookings = { some: {} };
    }

    const [tours, totalItems] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit,
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
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  async restoreTour(id: number) {
    const tour = await this.prisma.tour.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!tour) throw new NotFoundException(`Tour ${id} not found in trash`);
    return this.prisma.tour.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }

  private async assertCanPermanentDeleteTour(id: number) {
    const tour = await this.prisma.tour.findFirst({
      where: { id, deletedAt: { not: null } },
      include: { _count: { select: { bookings: true } } },
    });
    if (!tour) throw new NotFoundException(`Tour ${id} not found in trash`);
    if (tour._count.bookings > 0) {
      throw new BadRequestException(
        'Tour da phat sinh booking, chi duoc luu tru va khoi phuc',
      );
    }
    return tour;
  }

  async permanentDelete(id: number) {
    const tour = await this.assertCanPermanentDeleteTour(id);
    // Xóa cứng — cascade sẽ xóa luôn images, packages, departures liên quan
    await this.prisma.tour.delete({ where: { id } });
    return { message: `Tour "${tour.name}" đã bị xóa vĩnh viễn.` };
  }

  async bulkRestoreTours(ids: number[]) {
    const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Danh sach tour khong hop le');
    }

    const result = await this.prisma.tour.updateMany({
      where: { id: { in: uniqueIds }, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    return {
      requested: uniqueIds.length,
      restored: result.count,
      skipped: uniqueIds.length - result.count,
    };
  }

  async bulkPermanentDelete(ids: number[]) {
    const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Danh sach tour khong hop le');
    }

    const tours = await this.prisma.tour.findMany({
      where: { id: { in: uniqueIds }, deletedAt: { not: null } },
      include: { _count: { select: { bookings: true } } },
    });

    const foundIds = new Set(tours.map((tour) => tour.id));
    const blocked = tours
      .filter((tour) => tour._count.bookings > 0)
      .map((tour) => ({
        id: tour.id,
        name: tour.name,
        bookingCount: tour._count.bookings,
      }));
    const deletableIds = tours
      .filter((tour) => tour._count.bookings === 0)
      .map((tour) => tour.id);

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

  // ── Submit for Review (Staff) ─────────────────────────────────────────

  async submitForReview(id: number, requesterId: number) {
    const tour = await this.prisma.tour.findUnique({
      where: { id, deletedAt: null },
      include: {
        destination: { select: { id: true, name: true, travelScope: true, countryCode: true } },
        departures: {
          where: {
            isActive: true,
            departureDate: { gte: getMinBookableDate() },
          },
          select: { departureDate: true, availableSeats: true, isActive: true },
        },
      },
    });
    if (!tour) throw new NotFoundException(`Tour with ID ${id} not found`);

    if (tour.createdById !== requesterId) {
      throw new ForbiddenException('Bạn không có quyền gửi duyệt tour này');
    }
    // Cho phép gửi từ DRAFT (lần đầu) hoặc REJECTED (gửi lại sau khi bị từ chối)
    if (
      tour.status !== TourStatus.DRAFT &&
      tour.status !== TourStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Tour đang ở trạng thái "${tour.status}", không thể gửi duyệt`,
      );
    }

    requirePublishableTour(tour, { requireDepartures: true });

    return this.prisma.tour.update({
      where: { id },
      data: {
        status: TourStatus.PENDING_REVIEW,
        reviewNote: null,
      },
    });
  }

  // ── Review Tour (Admin) ───────────────────────────────────────────────

  async reviewTour(
    id: number,
    reviewerId: number,
    action: 'approve' | 'reject',
    note?: string,
  ) {
    const tour = await this.prisma.tour.findUnique({
      where: { id, deletedAt: null },
    });
    if (!tour) throw new NotFoundException(`Tour with ID ${id} not found`);

    if (tour.status !== TourStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Tour đang ở trạng thái "${tour.status}", không thể duyệt`,
      );
    }
    if (action === 'reject' && !note?.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối');
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

  // ── Get Pending Tours (Admin) ─────────────────────────────────────────

  async publishTour(id: number, publisherId: number) {
    const tour = await this.prisma.tour.findUnique({
      where: { id, deletedAt: null },
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
      },
    });
    if (!tour) throw new NotFoundException(`Tour with ID ${id} not found`);

    if (tour.status === TourStatus.COMPLETED) {
      throw new BadRequestException('Tour da ket thuc, khong the public lai');
    }

    requirePublishableTour(tour, { requireDepartures: true });

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
        orderBy: { updatedAt: 'asc' }, // FIFO — cũ nhất duyệt trước
        include: {
          destination: { select: { id: true, name: true, travelScope: true, countryCode: true } },
          createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      }),
      this.prisma.tour.count({
        where: { status: TourStatus.PENDING_REVIEW, deletedAt: null },
      }),
    ]);
    return { data: tours, count };
  }

  // ── Gallery ──────────────────────────────────────────────────────────

  async addGalleryImages(
    tourId: number,
    urls: string[],
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );
    const existing = await this.prisma.tourImage.findMany({
      where: { tourId },
      orderBy: { sortOrder: 'desc' },
      take: 1,
    });
    const baseOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
    const data = urls.map((url, i) => ({
      tourId,
      url,
      sortOrder: baseOrder + i,
    }));
    await this.prisma.tourImage.createMany({ data });
    return this.findOne(tourId, undefined, 'SUPER_ADMIN');
  }

  async removeGalleryImage(
    tourId: number,
    imageId: number,
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );
    await this.prisma.tourImage.delete({ where: { id: imageId, tourId } });
    return { message: 'Image removed' };
  }

  // ── Highlights ────────────────────────────────────────────────────────

  async upsertHighlights(
    tourId: number,
    highlights: { content: string; contentEn?: string; icon?: string; sortOrder?: number }[],
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );
    await this.prisma.tourHighlight.deleteMany({ where: { tourId } });
    if (highlights.length > 0) {
      await this.prisma.tourHighlight.createMany({
        data: highlights.map((h, i) => ({
          tourId,
          content: h.content,
          contentEn: h.contentEn?.trim() || null,
          icon: h.icon ?? 'auto_awesome',
          sortOrder: h.sortOrder ?? i,
        })),
      });
    }
    return this.prisma.tourHighlight.findMany({
      where: { tourId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ── FAQs ──────────────────────────────────────────────────────────────

  async upsertFaqs(
    tourId: number,
    faqs: { question: string; questionEn?: string; answer: string; answerEn?: string; sortOrder?: number }[],
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );
    await this.prisma.tourFAQ.deleteMany({ where: { tourId } });
    if (faqs.length > 0) {
      await this.prisma.tourFAQ.createMany({
        data: faqs.map((f, i) => ({
          tourId,
          question: f.question,
          questionEn: f.questionEn?.trim() || null,
          answer: f.answer,
          answerEn: f.answerEn?.trim() || null,
          sortOrder: f.sortOrder ?? i,
        })),
      });
    }
    return this.prisma.tourFAQ.findMany({
      where: { tourId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ── Itinerary Day Update ──────────────────────────────────────────────

  async updateItineraryDay(
    tourId: number,
    dayId: number,
    data: {
      title?: string;
      titleEn?: string;
      description?: string;
      descriptionEn?: string;
      mealsBreakfast?: boolean;
      mealsLunch?: boolean;
      mealsDinner?: boolean;
      accommodation?: string;
      accommodationEn?: string;
      transport?: string;
      transportEn?: string;
      activities?: string[];
      activitiesEn?: string[];
      imageUrl?: string;
      timeline?: any[];
      timelineEn?: any[];
    },
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );
    const day = await this.prisma.tourItinerary.findFirst({
      where: { id: dayId, tourId },
    });
    if (!day)
      throw new NotFoundException(
        `Itinerary day ${dayId} not found for tour ${tourId}`,
      );
    return this.prisma.tourItinerary.update({ where: { id: dayId }, data });
  }

  // ── Rating Stats ──────────────────────────────────────────────────────

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
        percent:
          total > 0 ? Math.round(((breakdown[star] ?? 0) / total) * 100) : 0,
      })),
    };
  }

  // ── Sale Deals ────────────────────────────────────────────────────────────

  async getSaleDeals(localeInput?: string) {
    const locale = normalizeLocale(localeInput);
    const now = new Date();
    const saleCategories = ['FLASH_SALE', 'EARLY_BIRD', 'LAST_MINUTE'];

    const departures = await this.prisma.tourDeparture.findMany({
      where: {
        AND: [
          {
            OR: [
              { category: { in: saleCategories } },
              { category: null, note: { in: saleCategories } },
            ],
          },
          {
            OR: [{ flashSaleEndsAt: null }, { flashSaleEndsAt: { gt: now } }],
          },
        ],
        isActive: true,
        departureDate: { gte: getMinBookableDate() },
        // Flash Sale chỉ hiện khi còn hạn; Early Bird/Last Minute không có deadline bắt buộc
        tour: { deletedAt: null, status: TourStatus.PUBLISHED },
      },
      include: {
        tour: {
          include: {
            destination: {
              select: {
                id: true,
                name: true,
                nameEn: true,
                travelScope: true,
                countryCode: true,
              },
            },
          },
        },
      },
      orderBy: [
        // Flash Sale sắp hết hạn nhất lên đầu (null xuống cuối)
        { flashSaleEndsAt: { sort: 'asc', nulls: 'last' } },
        { departureDate: 'asc' },
      ],
    });

    const badgeMapVi: Record<string, string> = {
      FLASH_SALE: 'FLASH SALE',
      EARLY_BIRD: 'ĐẶT SỚM',
      LAST_MINUTE: 'GIỜ CHÓT',
    };
    const badgeMapEn: Record<string, string> = {
      FLASH_SALE: 'FLASH SALE',
      EARLY_BIRD: 'EARLY BIRD',
      LAST_MINUTE: 'LAST MINUTE',
    };
    const badgeMap = locale === 'en' ? badgeMapEn : badgeMapVi;
    const categoryMap: Record<string, string> = {
      FLASH_SALE: 'flash',
      EARLY_BIRD: 'early',
      LAST_MINUTE: 'lastminute',
    };

    return departures.map((dep) => {
      const tour = dep.tour;
      const salePrice = dep.price ?? tour.price;
      const originalPrice = tour.price;
      const discountPct =
        originalPrice > 0
          ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
          : 0;

      // ✅ Tính % đã đặt THỰC TẾ — không random
      const maxSeats = dep.maxSeats ?? null;
      const bookedPercent =
        maxSeats && maxSeats > 0
          ? Math.min(
              99,
              Math.round(((maxSeats - dep.availableSeats) / maxSeats) * 100),
            )
          : null;

      const cat =
        dep.category ??
        (saleCategories.includes(dep.note ?? '') ? dep.note : null) ??
        'FLASH_SALE';

      return {
        id: dep.id,
        tourId: tour.id,
        name:
          locale === 'en'
            ? tour.nameEn?.trim() || toEnglishNameFallback(tour.name, tour.name)
            : tour.name,
        image: tour.imageUrl,
        badge:
          discountPct > 0
            ? `${badgeMap[cat] ?? cat} -${discountPct}%`
            : (badgeMap[cat] ?? cat),
        category: categoryMap[cat] ?? 'flash',
        rating: tour.averageRating,
        duration:
          locale === 'en'
            ? tour.durationEn?.trim() || toEnglishNameFallback(tour.duration, tour.duration)
            : tour.duration,
        newPrice: salePrice,
        oldPrice: originalPrice,
        discountPct,
        availableSeats: dep.availableSeats,
        maxSeats,
        bookedPercent, // ✅ Thực tế từ DB
        flashSaleEndsAt: dep.flashSaleEndsAt?.toISOString() ?? null, // ✅ Cho frontend countdown
        departureDate: dep.departureDate,
        destination:
          locale === 'en'
            ? tour.destination?.nameEn?.trim() ||
              toEnglishNameFallback(tour.destination?.name, tour.destination?.name ?? '')
            : tour.destination?.name ?? '',
      };
    });
  }
}
