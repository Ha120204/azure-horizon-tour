import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePackageDto {
  name: string;
  description?: string;
  price: number;
  badge?: string;
  includes: string[];
  excludes: string[];
  sortOrder?: number;
}

@Injectable()
export class TourPackageService {
  constructor(private prisma: PrismaService) {}

  /** Lấy tất cả packages của 1 tour (chỉ active, theo thứ tự) */
  async findByTour(tourId: number) {
    return this.prisma.tourPackage.findMany({
      where: { tourId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Lấy tất cả packages (kể cả inactive) — dùng cho admin */
  async findByTourAdmin(tourId: number) {
    return this.prisma.tourPackage.findMany({
      where: { tourId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Tạo package mới cho 1 tour */
  async create(tourId: number, dto: CreatePackageDto) {
    // Verify tour exists
    const tour = await this.prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour) throw new NotFoundException(`Tour #${tourId} không tồn tại`);

    return this.prisma.tourPackage.create({
      data: { tourId, ...dto },
    });
  }

  /** Cập nhật package */
  async update(id: number, dto: Partial<CreatePackageDto>) {
    const pkg = await this.prisma.tourPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException(`Package #${id} không tồn tại`);
    return this.prisma.tourPackage.update({ where: { id }, data: dto });
  }

  /** Xóa package */
  async remove(id: number) {
    const pkg = await this.prisma.tourPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException(`Package #${id} không tồn tại`);
    return this.prisma.tourPackage.delete({ where: { id } });
  }

  /** Bulk replace: xóa hết packages cũ và tạo lại — dùng khi save tour form */
  async bulkReplace(tourId: number, packages: CreatePackageDto[]) {
    await this.prisma.tourPackage.deleteMany({ where: { tourId } });
    if (packages.length === 0) return [];
    return this.prisma.tourPackage.createMany({
      data: packages.map((p, i) => ({ ...p, tourId, sortOrder: i })),
    });
  }
}
