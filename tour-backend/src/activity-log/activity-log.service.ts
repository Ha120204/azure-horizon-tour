import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLogDto {
    action: string;
    resource: string;
    resourceId?: string;
    targetName?: string;
    description: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
    userId?: number;
}

export class LogQueryDto {
    @IsOptional() @Type(() => Number) @IsNumber() page?: number;
    @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
    @IsOptional() @IsString() action?: string;
    @IsOptional() @IsString() resource?: string;
    @IsOptional() @Type(() => Number) @IsNumber() userId?: number;
    @IsOptional() @IsString() search?: string;
    @IsOptional() @IsString() dateFrom?: string;
    @IsOptional() @IsString() dateTo?: string;
}

@Injectable()
export class ActivityLogService {
    constructor(private prisma: PrismaService) {}

    // ── Ghi 1 log ──────────────────────────────────────────────────────────
    async create(dto: CreateLogDto) {
        return this.prisma.systemLog.create({
            data: {
                action:      dto.action,
                resource:    dto.resource,
                resourceId:  dto.resourceId,
                targetName:  dto.targetName,
                description: dto.description,
                oldData:     dto.oldData ?? Prisma.JsonNull,
                newData:     dto.newData ?? Prisma.JsonNull,
                ipAddress:   dto.ipAddress,
                userAgent:   dto.userAgent,
                userId:      dto.userId,
            },
        });
    }

    // ── Danh sách log với pagination + filter ─────────────────────────────
    async findAll(query: LogQueryDto) {
        const page  = Number(query.page)  || 1;
        const limit = Number(query.limit) || 20;
        const skip  = (page - 1) * limit;

        // Build WHERE with only guaranteed-safe fields
        const where: any = {};

        if (query.action)   where.action   = query.action;
        if (query.resource) where.resource = query.resource;
        if (query.userId)   where.userId   = Number(query.userId);

        if (query.search) {
            where.OR = [
                { description: { contains: query.search, mode: 'insensitive' } },
                { targetName:  { contains: query.search, mode: 'insensitive' } },
            ];
        }

        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};
            if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
            if (query.dateTo) {
                const to = new Date(query.dateTo);
                to.setHours(23, 59, 59, 999);
                where.createdAt.lte = to;
            }
        }

        let data: any[] = [];
        let total = 0;

        // Count chạy độc lập — luôn ổn định
        total = await this.prisma.systemLog.count({ where });

        // findMany có include — nếu fail thì fallback không include
        try {
            data = await (this.prisma.systemLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
                    },
                } as any,
            }) as any);
        } catch (err) {
            console.warn('[ActivityLog] include {user} failed, fallback:', (err as any)?.message);
            data = await (this.prisma.systemLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }) as any);
        }

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ── Chi tiết 1 log ─────────────────────────────────────────────────────
    async findOne(id: number) {
        return this.prisma.systemLog.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
                },
            },
        });
    }

    // ── KPI Stats ──────────────────────────────────────────────────────────
    async getStats() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [total, todayCount, byAction] = await Promise.all([
            this.prisma.systemLog.count(),
            this.prisma.systemLog.count({ where: { createdAt: { gte: todayStart } } }),
            this.prisma.systemLog.groupBy({
                by:      ['action'],
                _count:  { _all: true },
                orderBy: { _count: { action: 'desc' } },
            }),
        ]);

        const actionMap: Record<string, number> = {};
        byAction.forEach(row => { actionMap[row.action] = row._count._all; });

        return {
            total,
            todayCount,
            byAction: actionMap,
            create:   actionMap['CREATE']  || 0,
            update:   actionMap['UPDATE']  || 0,
            delete:   actionMap['DELETE']  || 0,
            login:    actionMap['LOGIN']   || 0,
        };
    }

    // ── Export CSV ─────────────────────────────────────────────────────────
    async exportCsv(query: LogQueryDto): Promise<string> {
        // Lấy tất cả không giới hạn (với filter)
        const unlimitedQuery = { ...query, limit: 10000, page: 1 };
        const { data } = await this.findAll(unlimitedQuery);

        const headers = ['ID', 'Thời gian', 'Hành động', 'Tài nguyên', 'Đối tượng', 'Mô tả', 'Người dùng', 'Email', 'Vai trò', 'IP'];
        const rows = data.map(log => [
            log.id,
            new Date(log.createdAt).toLocaleString('vi-VN'),
            log.action,
            log.resource,
            log.targetName || '',
            `"${log.description.replace(/"/g, '""')}"`,
            log.user?.fullName || 'System',
            log.user?.email || '',
            log.user?.role || '',
            log.ipAddress || '',
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        return '\uFEFF' + csv; // BOM để Excel hiểu UTF-8
    }
}
