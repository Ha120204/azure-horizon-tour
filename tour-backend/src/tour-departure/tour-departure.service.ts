import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TransportType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TourPermissionService } from '../tour/tour-permission.service';
import { localizeDeparture, normalizeLocale } from '../tour/localization';

export interface CreateDepartureDto {
  departureDate: string;
  price?: number | null;
  availableSeats: number;
  maxSeats?: number;
  note?: string;
  noteEn?: string;
  category?: string;
  flashSaleEndsAt?: string | null;
  sortOrder?: number;
}

export interface UpsertDepartureTransportDto {
  type: TransportType;
  // Chuyến bay chiều đi
  airline?: string;
  airlineEn?: string;
  flightCode?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  flightClass?: string;
  // Chuyến bay chiều về
  returnFlightCode?: string;
  returnAirline?: string;
  returnAirlineEn?: string;
  returnDepartureAirport?: string;
  returnArrivalAirport?: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  returnFlightClass?: string;
  // Quá cảnh (bay nối chuyến)
  transitPoint?: string;
  transitPointEn?: string;
  returnTransitPoint?: string;
  returnTransitPointEn?: string;
  // Xe / ô tô
  vehicleType?: string;
  vehicleTypeEn?: string;
  operator?: string;
  operatorEn?: string;
  boardingPoint?: string;
  boardingPointEn?: string;
  boardingTime?: string;
  gatheringTime?: string;
  // Ghi chú
  notes?: string;
  notesEn?: string;
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
  private readonly logger = new Logger(TourDepartureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tourPermission: TourPermissionService,
    private readonly configService: ConfigService,
  ) {}

  private revalidateTourCache(tourId: number): void {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const secret = this.configService.get<string>('REVALIDATION_SECRET');
    if (!frontendUrl || !secret) return;

    void fetch(`${frontendUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tag: `tour-${tourId}` }),
    }).catch((err: unknown) => {
      this.logger.warn(`[Revalidate] tour-${tourId} failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  /** Public: only active upcoming departures are bookable. */
  async findByTour(tourId: number, localeInput?: string) {
    const locale = normalizeLocale(localeInput);
    const departures = await this.prisma.tourDeparture.findMany({
      where: {
        tourId,
        isActive: true,
        departureDate: { gte: getMinBookableDate() },
      },
      include: { transport: true },
      orderBy: [{ sortOrder: 'asc' }, { departureDate: 'asc' }],
    });
    return departures.map((departure) => localizeDeparture(departure, locale));
  }

  /**
   * Admin: replace the editable upcoming schedule without hard-deleting history.
   * Past departures are archived with isActive=false; unchanged future departures
   * are updated in-place to preserve IDs that may be referenced by bookings.
   */
  async bulkReplace(
    tourId: number,
    dtos: CreateDepartureDto[],
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );

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

    const result = await this.prisma.$transaction(async (tx) => {
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
          noteEn: item.dto.noteEn ?? null,
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

    this.revalidateTourCache(tourId);
    return result;
  }

  /** Admin: get one departure for checkout validation. */
  async findOne(id: number) {
    const dep = await this.prisma.tourDeparture.findUnique({
      where: { id },
      include: { transport: true },
    });
    if (!dep) throw new NotFoundException(`Departure #${id} not found`);
    return dep;
  }

  async getTransport(departureId: number) {
    const transport = await this.prisma.tourDepartureTransport.findUnique({
      where: { departureId },
    });
    if (!transport) throw new NotFoundException(`Departure #${departureId} chưa có thông tin phương tiện`);
    return transport;
  }

  async deleteTransport(
    tourId: number,
    departureId: number,
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(tourId, requesterId, requesterRole);

    const dep = await this.prisma.tourDeparture.findFirst({
      where: { id: departureId, tourId },
    });
    if (!dep) throw new NotFoundException(`Departure #${departureId} không tồn tại trong tour #${tourId}`);

    await this.prisma.tourDepartureTransport.deleteMany({ where: { departureId } });
  }

  async upsertTransport(
    tourId: number,
    departureId: number,
    dto: UpsertDepartureTransportDto,
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(tourId, requesterId, requesterRole);

    const dep = await this.prisma.tourDeparture.findFirst({
      where: { id: departureId, tourId },
    });
    if (!dep) throw new NotFoundException(`Departure #${departureId} không tồn tại trong tour #${tourId}`);

    const data = {
      type: dto.type,
      airline: dto.airline ?? null,
      airlineEn: dto.airlineEn ?? null,
      flightCode: dto.flightCode ?? null,
      departureAirport: dto.departureAirport ?? null,
      arrivalAirport: dto.arrivalAirport ?? null,
      departureTime: dto.departureTime ? new Date(dto.departureTime) : null,
      arrivalTime: dto.arrivalTime ? new Date(dto.arrivalTime) : null,
      flightClass: dto.flightClass ?? null,
      returnFlightCode: dto.returnFlightCode ?? null,
      returnAirline: dto.returnAirline ?? null,
      returnAirlineEn: dto.returnAirlineEn ?? null,
      returnDepartureAirport: dto.returnDepartureAirport ?? null,
      returnArrivalAirport: dto.returnArrivalAirport ?? null,
      returnDepartureTime: dto.returnDepartureTime ? new Date(dto.returnDepartureTime) : null,
      returnArrivalTime: dto.returnArrivalTime ? new Date(dto.returnArrivalTime) : null,
      returnFlightClass: dto.returnFlightClass ?? null,
      transitPoint: dto.transitPoint ?? null,
      transitPointEn: dto.transitPointEn ?? null,
      returnTransitPoint: dto.returnTransitPoint ?? null,
      returnTransitPointEn: dto.returnTransitPointEn ?? null,
      vehicleType: dto.vehicleType ?? null,
      vehicleTypeEn: dto.vehicleTypeEn ?? null,
      operator: dto.operator ?? null,
      operatorEn: dto.operatorEn ?? null,
      boardingPoint: dto.boardingPoint ?? null,
      boardingPointEn: dto.boardingPointEn ?? null,
      boardingTime: dto.boardingTime ? new Date(dto.boardingTime) : null,
      gatheringTime: dto.gatheringTime ? new Date(dto.gatheringTime) : null,
      notes: dto.notes ?? null,
      notesEn: dto.notesEn ?? null,
    };

    return this.prisma.tourDepartureTransport.upsert({
      where: { departureId },
      create: { departureId, ...data },
      update: data,
    });
  }
}
