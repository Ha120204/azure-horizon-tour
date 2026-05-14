import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDepartureDto {
    departureDate: string;   // ISO string
    price?: number | null;   // null = dùng tour.price
    availableSeats: number;
    maxSeats?: number;       // [FLASH SALE] Tổng ghế ban đầu — để tính % đã đặt
    note?: string;
    category?: string;       // [FLASH SALE] 'FLASH_SALE' | 'EARLY_BIRD' | 'LAST_MINUTE'
    flashSaleEndsAt?: string | null; // [FLASH SALE] ISO datetime
    sortOrder?: number;
}

@Injectable()
export class TourDepartureService {
    constructor(private readonly prisma: PrismaService) {}

    /** Public: lấy danh sách ngày khởi hành đang active của 1 tour */
    async findByTour(tourId: number) {
        return this.prisma.tourDeparture.findMany({
            where: { tourId, isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { departureDate: 'asc' }],
        });
    }

    /** Admin: xóa tất cả departure của tour rồi tạo lại toàn bộ (bulk replace) */
    async bulkReplace(tourId: number, dtos: CreateDepartureDto[]) {
        // Kiểm tra tour tồn tại
        const tour = await this.prisma.tour.findUnique({ where: { id: tourId } });
        if (!tour) throw new NotFoundException(`Tour #${tourId} not found`);

        if (!Array.isArray(dtos)) throw new BadRequestException('departures phải là mảng');

            return this.prisma.$transaction(async (tx) => {
            // Xóa tất cả departure cũ
            await tx.tourDeparture.deleteMany({ where: { tourId } });

            if (dtos.length === 0) return [];

            // Tạo mới
            await tx.tourDeparture.createMany({
                data: dtos.map((d, i) => ({
                    tourId,
                    departureDate: new Date(d.departureDate),
                    price: d.price ?? null,
                    availableSeats: d.availableSeats ?? 0,
                    maxSeats: d.maxSeats ?? null,
                    note: d.note ?? null,
                    category: d.category ?? null,
                    flashSaleEndsAt: d.flashSaleEndsAt ? new Date(d.flashSaleEndsAt) : null,
                    sortOrder: d.sortOrder ?? i,
                    isActive: true,
                })),
            });

            return tx.tourDeparture.findMany({
                where: { tourId },
                orderBy: [{ sortOrder: 'asc' }, { departureDate: 'asc' }],
            });
        });
    }

    /** Admin: lấy 1 departure cụ thể (để checkout validate) */
    async findOne(id: number) {
        const dep = await this.prisma.tourDeparture.findUnique({ where: { id } });
        if (!dep) throw new NotFoundException(`Departure #${id} not found`);
        return dep;
    }
}
