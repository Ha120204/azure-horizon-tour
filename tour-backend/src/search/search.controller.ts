import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TravelScope } from '@prisma/client';

function parseTravelScope(input?: string): TravelScope | undefined {
    if (!input) return undefined;
    if (input === TravelScope.DOMESTIC || input === TravelScope.INTERNATIONAL) {
        return input;
    }
    throw new BadRequestException('travelScope không hợp lệ');
}

@Controller('search')
export class SearchController {
    constructor(private prisma: PrismaService) { }

    /**
     * Trả toàn bộ danh sách Destinations (dùng cho dropdown gợi ý khi focus input)
     */
    @Get('destinations')
    async getAllDestinations(@Query('travelScope') travelScopeInput?: string) {
        const travelScope = parseTravelScope(travelScopeInput);
        return this.prisma.destination.findMany({
            where: travelScope ? { travelScope } : undefined,
            select: {
                id: true,
                name: true,
                imageUrl: true,
                region: true,
                travelScope: true,
                countryCode: true,
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Tạo Destination mới (dùng trong TourFormModal khi không tìm thấy điểm đến)
     */
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
    @Post('destinations')
    async createDestination(@Body() body: { name: string; travelScope?: string; countryCode?: string }) {
        const name = (body.name || '').trim();
        if (!name) throw new BadRequestException('Tên điểm đến không được để trống');
        const travelScope = parseTravelScope(body.travelScope) ?? TravelScope.DOMESTIC;
        const countryCode = (body.countryCode || '').trim().toUpperCase() || (travelScope === TravelScope.DOMESTIC ? 'VN' : null);

        // Check if destination already exists (case insensitive)
        const existingDestination = await this.prisma.destination.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        });

        if (existingDestination) {
            throw new BadRequestException(`Điểm đến "${name}" đã tồn tại.`);
        }

        // Auto-generate slug from name
        const slug = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'd')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
        return this.prisma.destination.create({
            data: { name, slug: `${slug}-${Date.now()}`, travelScope, countryCode },
            select: { id: true, name: true, travelScope: true, countryCode: true },
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
    async liveSearch(@Query('q') query: string, @Query('travelScope') travelScopeInput?: string) {
        if (!query || query.length < 2) {
            return { destinations: [], tours: [] };
        }
        const travelScope = parseTravelScope(travelScopeInput);

        // Dùng mode 'insensitive' để tìm không phân biệt chữ hoa/thường
        const [destinations, tours] = await Promise.all([
            // 1. Lấy trực tiếp từ bảng Destination (kèm imageUrl cho thumbnail)
            this.prisma.destination.findMany({
                where: {
                    name: { contains: query, mode: 'insensitive' },
                    ...(travelScope ? { travelScope } : {}),
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    region: true,
                    travelScope: true,
                    countryCode: true,
                },
            }),

            // 2. Lấy tối đa 4 tour khớp tên
            this.prisma.tour.findMany({
                where: {
                    name: { contains: query, mode: 'insensitive' },
                    deletedAt: null,
                    ...(travelScope ? { destination: { travelScope } } : {}),
                },
                take: 4,
                select: { id: true, name: true, price: true }
            })
        ]);

        // Trả thẳng dữ liệu về
        return { destinations, tours };
    }
}
