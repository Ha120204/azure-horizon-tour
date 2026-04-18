import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Chỉnh đường dẫn cho đúng

@Controller('search')
export class SearchController {
    constructor(private prisma: PrismaService) { }

    /**
     * Trả toàn bộ danh sách Destinations (dùng cho dropdown gợi ý khi focus input)
     */
    @Get('destinations')
    async getAllDestinations() {
        return this.prisma.destination.findMany({
            select: {
                id: true,
                name: true,
                imageUrl: true,
                region: true,
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Trả min/max giá tour từ DB (dùng để frontend tự tính khoảng giá)
     */
    @Get('price-range')
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

    /**
     * Live search: tìm Destinations + Tours theo từ khóa
     */
    @Get()
    async liveSearch(@Query('q') query: string) {
        if (!query || query.length < 2) {
            return { destinations: [], tours: [] };
        }

        // Dùng mode 'insensitive' để tìm không phân biệt chữ hoa/thường
        const [destinations, tours] = await Promise.all([
            // 1. Lấy trực tiếp từ bảng Destination (kèm imageUrl cho thumbnail)
            this.prisma.destination.findMany({
                where: { name: { contains: query, mode: 'insensitive' } },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    region: true,
                },
            }),

            // 2. Lấy tối đa 4 tour khớp tên
            this.prisma.tour.findMany({
                where: {
                    name: { contains: query, mode: 'insensitive' },
                    deletedAt: null,
                },
                take: 4,
                select: { id: true, name: true, price: true }
            })
        ]);

        // Trả thẳng dữ liệu về
        return { destinations, tours };
    }
}