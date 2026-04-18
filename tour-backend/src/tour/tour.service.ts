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

    // [PHASE 1] Luôn filter bỏ tour đã bị xóa mềm
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
        include: { destination: { select: { name: true } } }
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
      where: { id, deletedAt: null }, // [PHASE 1] Không trả tour đã xóa mềm
      // [PHASE 1] Include đầy đủ relations cho Frontend Tour Detail page
      include: {
        destination: true,
        itinerary: {
          orderBy: { dayNumber: 'asc' },
        },
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
      where: { id, deletedAt: null }, // [PHASE 1] Không cho update tour đã xóa
      data: {
        ...rest,
        ...(destinationId !== undefined && {
          destination: { connect: { id: destinationId } },
        }),
      },
    });
  }

  // [PHASE 1] Soft Delete: đặt deletedAt thay vì xóa vật lý
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
}
