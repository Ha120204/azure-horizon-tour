import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TourPermissionService } from '../tour/tour-permission.service';
import { localizePackage, normalizeLocale } from '../tour/localization';

export interface CreatePackageDto {
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  badge?: string;
  includes: string[];
  includesEn?: string[];
  excludes: string[];
  excludesEn?: string[];
  sortOrder?: number;
}

@Injectable()
export class TourPackageService {
  constructor(
    private prisma: PrismaService,
    private readonly tourPermission: TourPermissionService,
  ) {}

  /** Public: active packages only. */
  async findByTour(tourId: number, localeInput?: string) {
    const locale = normalizeLocale(localeInput);
    const packages = await this.prisma.tourPackage.findMany({
      where: { tourId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return packages.map((pkg) => localizePackage(pkg, locale));
  }

  /** Internal editor read: same access policy as mutating a tour. */
  async findByTourAdmin(
    tourId: number,
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );
    return this.prisma.tourPackage.findMany({
      where: { tourId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(
    tourId: number,
    dto: CreatePackageDto,
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );
    return this.prisma.tourPackage.create({
      data: { tourId, ...dto, includesEn: dto.includesEn ?? [], excludesEn: dto.excludesEn ?? [] },
    });
  }

  async update(
    tourId: number,
    id: number,
    dto: Partial<CreatePackageDto>,
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );
    const pkg = await this.prisma.tourPackage.findFirst({
      where: { id, tourId },
    });
    if (!pkg) throw new NotFoundException(`Package #${id} khong ton tai`);
    return this.prisma.tourPackage.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.includesEn !== undefined && { includesEn: dto.includesEn ?? [] }),
        ...(dto.excludesEn !== undefined && { excludesEn: dto.excludesEn ?? [] }),
      },
    });
  }

  async remove(
    tourId: number,
    id: number,
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );
    const pkg = await this.prisma.tourPackage.findFirst({
      where: { id, tourId },
    });
    if (!pkg) throw new NotFoundException(`Package #${id} khong ton tai`);
    return this.prisma.tourPackage.delete({ where: { id } });
  }

  async bulkReplace(
    tourId: number,
    packages: CreatePackageDto[],
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(
      tourId,
      requesterId,
      requesterRole,
    );
    await this.prisma.tourPackage.deleteMany({ where: { tourId } });
    if (packages.length === 0) return [];
    return this.prisma.tourPackage.createMany({
      data: packages.map((p, i) => ({
        ...p,
        tourId,
        sortOrder: i,
        includesEn: p.includesEn ?? [],
        excludesEn: p.excludesEn ?? [],
      })),
    });
  }
}
