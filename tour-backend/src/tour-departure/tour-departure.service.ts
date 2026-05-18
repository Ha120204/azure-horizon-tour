import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDepartureDto {
  departureDate: string;
  price?: number | null;
  availableSeats: number;
  maxSeats?: number;
  note?: string;
  category?: string;
  flashSaleEndsAt?: string | null;
  sortOrder?: number;
}

const getMinBookableDateKey = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const getMinBookableDate = () =>
  new Date(`${getMinBookableDateKey()}T00:00:00.000Z`);

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseDepartureDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Ngay khoi hanh "${value}" khong hop le`);
  }
  return date;
};

@Injectable()
export class TourDepartureService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: only active upcoming departures are bookable. */
  async findByTour(tourId: number) {
    return this.prisma.tourDeparture.findMany({
      where: {
        tourId,
        isActive: true,
        departureDate: { gte: getMinBookableDate() },
      },
      orderBy: [{ sortOrder: 'asc' }, { departureDate: 'asc' }],
    });
  }

  /**
   * Admin: replace the editable upcoming schedule without hard-deleting history.
   * Past departures are archived with isActive=false; unchanged future departures
   * are updated in-place to preserve IDs that may be referenced by bookings.
   */
  async bulkReplace(tourId: number, dtos: CreateDepartureDto[]) {
    const tour = await this.prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour) throw new NotFoundException(`Tour #${tourId} not found`);

    if (!Array.isArray(dtos)) {
      throw new BadRequestException('departures phai la mang');
    }

    const minDate = getMinBookableDate();
    const minDateKey = getMinBookableDateKey();
    const normalized = dtos
      .filter((d) => d.departureDate)
      .map((d, i) => {
        const departureDate = parseDepartureDate(d.departureDate);
        return {
          dto: d,
          departureDate,
          dateKey: toDateKey(departureDate),
          sortOrder: d.sortOrder ?? i,
        };
      })
      .filter((item) => item.dateKey >= minDateKey);

    const seen = new Set<string>();
    const duplicate = normalized.find((item) => {
      if (seen.has(item.dateKey)) return true;
      seen.add(item.dateKey);
      return false;
    });
    if (duplicate) {
      throw new BadRequestException(
        `Ngay khoi hanh ${duplicate.dateKey} bi trung trong danh sach hien tai`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.tourDeparture.updateMany({
        where: {
          tourId,
          isActive: true,
          departureDate: { lt: minDate },
        },
        data: { isActive: false },
      });

      const existingFuture = await tx.tourDeparture.findMany({
        where: {
          tourId,
          isActive: true,
          departureDate: { gte: minDate },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });

      const existingByDate = new Map<string, typeof existingFuture>();
      for (const departure of existingFuture) {
        const key = toDateKey(departure.departureDate);
        existingByDate.set(key, [
          ...(existingByDate.get(key) ?? []),
          departure,
        ]);
      }

      const keptIds: number[] = [];
      for (const item of normalized) {
        const existing = existingByDate.get(item.dateKey)?.shift();
        const data = {
          departureDate: item.departureDate,
          price: item.dto.price ?? null,
          availableSeats: item.dto.availableSeats ?? 0,
          maxSeats: item.dto.maxSeats ?? null,
          note: item.dto.note ?? null,
          category: item.dto.category ?? null,
          flashSaleEndsAt: item.dto.flashSaleEndsAt
            ? new Date(item.dto.flashSaleEndsAt)
            : null,
          sortOrder: item.sortOrder,
          isActive: true,
        };

        if (existing) {
          const updated = await tx.tourDeparture.update({
            where: { id: existing.id },
            data,
          });
          keptIds.push(updated.id);
        } else {
          const created = await tx.tourDeparture.create({
            data: { tourId, ...data },
          });
          keptIds.push(created.id);
        }
      }

      await tx.tourDeparture.updateMany({
        where: {
          tourId,
          isActive: true,
          departureDate: { gte: minDate },
          id: { notIn: keptIds },
        },
        data: { isActive: false },
      });

      return tx.tourDeparture.findMany({
        where: {
          tourId,
          isActive: true,
          departureDate: { gte: minDate },
        },
        orderBy: [{ sortOrder: 'asc' }, { departureDate: 'asc' }],
      });
    });
  }

  /** Admin: get one departure for checkout validation. */
  async findOne(id: number) {
    const dep = await this.prisma.tourDeparture.findUnique({ where: { id } });
    if (!dep) throw new NotFoundException(`Departure #${id} not found`);
    return dep;
  }
}
