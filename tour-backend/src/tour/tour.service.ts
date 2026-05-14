import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, TourStatus } from '@prisma/client';
import { CreateTourDto } from './dto/create-tour.dto';
import { FilterTourDto } from './dto/filter-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { PrismaService } from '../prisma/prisma.service';

const DRAFT_DESTINATION_NAME = 'Chưa xác định';

const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
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
  if (tour.destination?.name === DRAFT_DESTINATION_NAME) errors.push('Diem den');
  if (!hasText(tour.duration)) errors.push('Thoi luong');
  if (tour.availableSeats == null || Number(tour.availableSeats) < 1) errors.push('So ghe');

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

@Injectable()
export class TourService {
  constructor(private readonly prisma: PrismaService) {}

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
      ? (dtoStatus ?? TourStatus.PUBLISHED)
      : TourStatus.DRAFT;

    if (isAdminRole || finalStatus === TourStatus.PENDING_REVIEW) {
      requirePublishableTour(createTourDto);
    }

    const resolvedDestinationId = await this.resolveDestinationId(destinationId);

    return this.prisma.tour.create({
      data: {
        name: createTourDto.name?.trim() ?? '',
        description: createTourDto.description?.trim() ?? '',
        price: createTourDto.price ?? 0,
        destination: { connect: { id: resolvedDestinationId } },
        startDate: createTourDto.startDate ?? getTomorrow(),
        duration: createTourDto.duration?.trim() || 'Chua xac dinh',
        availableSeats: createTourDto.availableSeats ?? 0,
        imageUrl: createTourDto.imageUrl?.trim() || null,
        tourType: createTourDto.tourType?.trim() || 'Luxury Retreat',
        departurePoint: createTourDto.departurePoint?.trim() || null,
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
  ) {
    const {
      dest,
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

    const where: Prisma.TourWhereInput = { deletedAt: null };

    // Visibility: Staff chỉ thấy tour của mình; Admin thấy tất cả; Public chỉ thấy PUBLISHED
    if (requesterRole === 'STAFF' && requesterId) {
      if (
        status &&
        Object.values(TourStatus).includes(status as TourStatus)
      ) {
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
      const searchFilter: Prisma.TourWhereInput = {
        OR: [
          { name: { contains: dest, mode: 'insensitive' } },
          { destination: { name: { contains: dest, mode: 'insensitive' } } },
        ],
      };
      where.AND = Array.isArray(where.AND)
        ? [...where.AND, searchFilter]
        : where.AND
          ? [where.AND as Prisma.TourWhereInput, searchFilter]
          : [searchFilter];
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
      const ratingArr = ratings.split(',').map((r) => parseFloat(r));
      where.averageRating = { gte: Math.min(...ratingArr) };
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
          destination: { select: { name: true } },
          departures: { select: { price: true }, where: { isActive: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.tour.count({ where }),
    ]);

    return {
      data: tours,
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
      this.prisma.tour.count({ where: workflowWhere(TourStatus.PENDING_REVIEW) }),
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
        createdBy: { select: { id: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!tour) {
      throw new NotFoundException(`Tour with ID ${id} not found`);
    }
    return tour;
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
        ...(rest.description !== undefined && {
          description: rest.description?.trim() ?? '',
        }),
        ...(rest.duration !== undefined && {
          duration: rest.duration?.trim() || 'Chua xac dinh',
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
        ...(isAdminRole && status !== undefined && { status }),
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

  async getTrashedTours(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [tours, totalItems] = await Promise.all([
      this.prisma.tour.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit,
        include: {
          destination: { select: { name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.tour.count({ where: { deletedAt: { not: null } } }),
    ]);
    return {
      data: tours,
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
        // Khôi phục vào hàng chờ duyệt để Admin kiểm tra lại
        status: TourStatus.PENDING_REVIEW,
      },
    });
  }

  async permanentDelete(id: number) {
    const tour = await this.prisma.tour.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!tour) throw new NotFoundException(`Tour ${id} not found in trash`);
    // Xóa cứng — cascade sẽ xóa luôn images, packages, departures, reviews liên quan
    await this.prisma.tour.delete({ where: { id } });
    return { message: `Tour "${tour.name}" đã bị xóa vĩnh viễn.` };
  }

  // ── Submit for Review (Staff) ─────────────────────────────────────────

  async submitForReview(id: number, requesterId: number) {
    const tour = await this.prisma.tour.findUnique({
      where: { id, deletedAt: null },
      include: {
        destination: { select: { name: true } },
        departures: {
          where: { isActive: true },
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

  async getPendingTours() {
    const [tours, count] = await Promise.all([
      this.prisma.tour.findMany({
        where: { status: TourStatus.PENDING_REVIEW, deletedAt: null },
        orderBy: { updatedAt: 'asc' }, // FIFO — cũ nhất duyệt trước
        include: {
          destination: { select: { name: true } },
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

  async addGalleryImages(tourId: number, urls: string[]) {
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
    return this.findOne(tourId);
  }

  async removeGalleryImage(tourId: number, imageId: number) {
    await this.prisma.tourImage.delete({ where: { id: imageId, tourId } });
    return { message: 'Image removed' };
  }

  // ── Highlights ────────────────────────────────────────────────────────

  async upsertHighlights(
    tourId: number,
    highlights: { content: string; icon?: string; sortOrder?: number }[],
  ) {
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
    return this.prisma.tourHighlight.findMany({
      where: { tourId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ── FAQs ──────────────────────────────────────────────────────────────

  async upsertFaqs(
    tourId: number,
    faqs: { question: string; answer: string; sortOrder?: number }[],
  ) {
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
      description?: string;
      mealsBreakfast?: boolean;
      mealsLunch?: boolean;
      mealsDinner?: boolean;
      accommodation?: string;
      transport?: string;
      activities?: string[];
      imageUrl?: string;
      timeline?: any[];
    },
  ) {
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

  async getSaleDeals() {
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
        // Flash Sale chỉ hiện khi còn hạn; Early Bird/Last Minute không có deadline bắt buộc
        tour: { deletedAt: null, status: TourStatus.PUBLISHED },
      },
      include: {
        tour: {
          include: { destination: { select: { name: true } } },
        },
      },
      orderBy: [
        // Flash Sale sắp hết hạn nhất lên đầu (null xuống cuối)
        { flashSaleEndsAt: { sort: 'asc', nulls: 'last' } },
        { departureDate: 'asc' },
      ],
    });

    const badgeMap: Record<string, string> = {
      FLASH_SALE: 'FLASH SALE',
      EARLY_BIRD: 'ĐẶT SỚM',
      LAST_MINUTE: 'GIỜ CHÓT',
    };
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
        name: tour.name,
        image: tour.imageUrl,
        badge:
          discountPct > 0
            ? `${badgeMap[cat] ?? cat} -${discountPct}%`
            : (badgeMap[cat] ?? cat),
        category: categoryMap[cat] ?? 'flash',
        rating: tour.averageRating,
        duration: tour.duration,
        newPrice: salePrice,
        oldPrice: originalPrice,
        discountPct,
        availableSeats: dep.availableSeats,
        maxSeats,
        bookedPercent, // ✅ Thực tế từ DB
        flashSaleEndsAt: dep.flashSaleEndsAt?.toISOString() ?? null, // ✅ Cho frontend countdown
        departureDate: dep.departureDate,
        destination: tour.destination?.name ?? '',
      };
    });
  }
}
