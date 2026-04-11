import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Chỉnh đường dẫn cho đúng

@Controller('search')
export class SearchController {
    constructor(private prisma: PrismaService) { }

    @Get()
    async liveSearch(@Query('q') query: string) {
        if (!query || query.length < 2) {
            return { destinations: [], tours: [] };
        }

        // Dùng mode 'insensitive' để tìm không phân biệt chữ hoa/thường
        const [destinations, tours] = await Promise.all([
            // 1. Lấy trực tiếp từ bảng Destination
            this.prisma.destination.findMany({
                where: { name: { contains: query, mode: 'insensitive' } },
                take: 3,
                select: {
                    id: true,
                    name: true,
                    region: true
                },
            }),

            // 2. Lấy tối đa 4 tour khớp tên (Giữ nguyên)
            this.prisma.tour.findMany({
                where: { name: { contains: query, mode: 'insensitive' } },
                take: 4,
                select: { id: true, name: true, price: true }
            })
        ]);

        // Trả thẳng dữ liệu về
        return { destinations, tours };
    }
}