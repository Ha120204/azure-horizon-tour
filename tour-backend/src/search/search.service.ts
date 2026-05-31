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

  /** Lấy danh sách điểm khởi hành distinct từ tours (theo travelScope) */
  async getDeparturePoints(travelScopeInput?: string, localeInput?: string) {
    const travelScope = parseTravelScope(travelScopeInput);
    const locale = normalizeLocale(localeInput);

    const tours = await this.prisma.tour.findMany({
      where: {
        deletedAt: null,
        ...(travelScope ? { destination: { travelScope } } : {}),
        OR: [
          { departurePoint: { not: null } },
          { departurePointEn: { not: null } },
        ],
      },
      select: { departurePoint: true, departurePointEn: true },
      distinct: ['departurePoint'],
      orderBy: { departurePoint: 'asc' },
    });

    // Lọc unique và trả về theo locale
    const points = tours
      .map((t) => {
        const vi = t.departurePoint?.trim() ?? '';
        const en = t.departurePointEn?.trim() ?? '';
        return {
          vi: vi || en,
          en: en || vi,
          label: locale === 'en' ? (en || vi) : (vi || en),
        };
      })
      .filter((p) => {
        if (!p.label || p.label.length === 0) return false;
        // Loại các điểm khởi hành là combo nhiều thành phố (dữ liệu nhập không chuẩn)
        const lower = p.label.toLowerCase();
        if (lower.includes(' hoặc ') || lower.includes(' or ') || lower.includes(' và ') || lower.includes(' / ')) return false;
        // Loại tên quá dài (> 40 ký tự là tên điểm khởi hành không chuẩn)
        if (p.label.length > 40) return false;
        return true;
      });

    // Deduplicate by label
    const seen = new Set<string>();
    const unique = points.filter((p) => {
      if (seen.has(p.label)) return false;
      seen.add(p.label);
      return true;
    });

    // Fallback: nếu DB chưa có data, trả về các thành phố lớn mặc định
    if (unique.length === 0) {
      const defaults =
        travelScope === 'INTERNATIONAL'
          ? [
              { label: locale === 'en' ? 'Ho Chi Minh City (SGN)' : 'TP. Hồ Chí Minh (SGN)', vi: 'TP. Hồ Chí Minh (SGN)', en: 'Ho Chi Minh City (SGN)' },
              { label: locale === 'en' ? 'Hanoi (HAN)' : 'Hà Nội (HAN)', vi: 'Hà Nội (HAN)', en: 'Hanoi (HAN)' },
              { label: locale === 'en' ? 'Da Nang (DAD)' : 'Đà Nẵng (DAD)', vi: 'Đà Nẵng (DAD)', en: 'Da Nang (DAD)' },
            ]
          : [
              { label: locale === 'en' ? 'Ho Chi Minh City' : 'TP. Hồ Chí Minh', vi: 'TP. Hồ Chí Minh', en: 'Ho Chi Minh City' },
              { label: locale === 'en' ? 'Hanoi' : 'Hà Nội', vi: 'Hà Nội', en: 'Hanoi' },
              { label: locale === 'en' ? 'Da Nang' : 'Đà Nẵng', vi: 'Đà Nẵng', en: 'Da Nang' },
              { label: locale === 'en' ? 'Can Tho' : 'Cần Thơ', vi: 'Cần Thơ', en: 'Can Tho' },
              { label: locale === 'en' ? 'Hai Phong' : 'Hải Phòng', vi: 'Hải Phòng', en: 'Hai Phong' },
              { label: locale === 'en' ? 'Nha Trang' : 'Nha Trang', vi: 'Nha Trang', en: 'Nha Trang' },
              { label: locale === 'en' ? 'Hue' : 'Huế', vi: 'Huế', en: 'Hue' },
              { label: locale === 'en' ? 'Vung Tau' : 'Vũng Tàu', vi: 'Vũng Tàu', en: 'Vung Tau' },
            ];
      return defaults;
    }

    return unique;
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
