import { BadRequestException, Injectable } from '@nestjs/common';
import { TravelScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  localizeDestination,
  normalizeLocale,
  toEnglishNameFallback,
} from '../tour/tour-localization';

// ─── Helpers (internal) ───────────────────────────────────────────────────────

export function parseTravelScope(input?: string): TravelScope | undefined {
  if (!input) return undefined;
  if (input === TravelScope.DOMESTIC || input === TravelScope.INTERNATIONAL) {
    return input;
  }
  throw new BadRequestException('travelScope khong hop le');
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy tất cả destinations cho suggestion dropdowns */
  async getAllDestinations(travelScopeInput?: string, localeInput?: string) {
    const travelScope = parseTravelScope(travelScopeInput);
    const locale = normalizeLocale(localeInput);
    const destinations = await this.prisma.destination.findMany({
      where: travelScope ? { travelScope } : undefined,
      select: {
        id: true,
        name: true,
        nameEn: true,
        imageUrl: true,
        region: true,
        regionEn: true,
        travelScope: true,
        countryCode: true,
      },
      orderBy: { name: 'asc' },
    });
    return destinations.map((destination) => localizeDestination(destination, locale));
  }

  /** Tạo destination mới (dùng bởi admin tour form) */
  async createDestination(body: {
    name: string;
    travelScope?: string;
    countryCode?: string;
  }) {
    const name = (body.name || '').trim();
    if (!name) throw new BadRequestException('Ten diem den khong duoc de trong');

    const travelScope = parseTravelScope(body.travelScope) ?? TravelScope.DOMESTIC;
    const countryCode =
      (body.countryCode || '').trim().toUpperCase() ||
      (travelScope === TravelScope.DOMESTIC ? 'VN' : null);

    const existingDestination = await this.prisma.destination.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingDestination) {
      throw new BadRequestException(`Diem den "${name}" da ton tai.`);
    }

    const slug = normalizeSearchText(name).replace(/\s+/g, '-');
    return this.prisma.destination.create({
      data: { name, slug: `${slug}-${Date.now()}`, travelScope, countryCode },
      select: { id: true, name: true, travelScope: true, countryCode: true },
    });
  }

  /** Lấy khoảng giá min/max của tour */
  async getPriceRange() {
    const result = await this.prisma.tour.aggregate({
      where: { deletedAt: null },
      _min: { price: true },
      _max: { price: true },
    });
    return {
      min: result._min.price ?? 0,
      max: result._max.price ?? 0,
    };
  }

  /** Live search destinations và tours, hỗ trợ tiếng Việt có/không dấu */
  async liveSearch(query: string, travelScopeInput?: string, localeInput?: string) {
    const normalizedQuery = normalizeSearchText(query || '');
    if (normalizedQuery.length < 2) {
      return { destinations: [], tours: [] };
    }

    const travelScope = parseTravelScope(travelScopeInput);
    const locale = normalizeLocale(localeInput);

    const [destinationCandidates, tourCandidates] = await Promise.all([
      this.prisma.destination.findMany({
        where: travelScope ? { travelScope } : {},
        select: {
          id: true,
          name: true,
          nameEn: true,
          imageUrl: true,
          region: true,
          regionEn: true,
          travelScope: true,
          countryCode: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.tour.findMany({
        where: {
          deletedAt: null,
          ...(travelScope ? { destination: { travelScope } } : {}),
        },
        select: {
          id: true,
          name: true,
          nameEn: true,
          price: true,
          destination: { select: { name: true, nameEn: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const destinations = destinationCandidates
      .filter((destination) =>
        normalizeSearchText(
          `${destination.name} ${destination.nameEn ?? ''} ${destination.region ?? ''} ${destination.regionEn ?? ''}`,
        ).includes(normalizedQuery),
      )
      .slice(0, 5)
      .map((destination) => localizeDestination(destination, locale));

    const tours = tourCandidates
      .filter((tour) =>
        normalizeSearchText(
          `${tour.name} ${tour.nameEn ?? ''} ${tour.destination?.name ?? ''} ${tour.destination?.nameEn ?? ''}`,
        ).includes(normalizedQuery),
      )
      .slice(0, 4)
      .map(({ destination, ...tour }) => {
        void destination;
        if (locale !== 'en') return tour;
        return {
          ...tour,
          name: tour.nameEn?.trim() || toEnglishNameFallback(tour.name, tour.name),
        };
      });

    return { destinations, tours };
  }
}
