import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
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
    @IsOptional() @IsString() role?: string;
    @IsOptional() @IsString() severity?: string;
    @IsOptional() @IsString() sortBy?: string;
    @IsOptional() @IsString() sortOrder?: string;
}

const IMPORTANT_RESOURCES = ['Booking', 'User', 'Voucher', 'Tour'];

const normalizeRoleFilter = (role?: string): Role | 'SYSTEM' | null => {
    const normalized = role?.trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === 'SYSTEM') return 'SYSTEM';
    return Object.values(Role).includes(normalized as Role) ? normalized as Role : null;
};

const buildSeverityWhere = (severity?: string): Prisma.SystemLogWhereInput | null => {
    const normalized = severity?.trim().toUpperCase();
    if (!normalized) return null;

    const critical: Prisma.SystemLogWhereInput = { action: { in: ['ROLE_CHANGE', 'EXPORT'] } };
    const attention: Prisma.SystemLogWhereInput = { action: { in: ['DELETE', 'CANCEL_BOOKING'] } };
    const important: Prisma.SystemLogWhereInput = {
        action: 'UPDATE',
        resource: { in: IMPORTANT_RESOURCES },
    };

    switch (normalized) {
        case 'CRITICAL':
            return critical;
        case 'ATTENTION':
            return attention;
        case 'IMPORTANT':
            return important;
        case 'NORMAL':
            return { NOT: [critical, attention, important] };
        default:
            return null;
    }
};

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
    async findAll(query: LogQueryDto, viewerRole?: string) {
        const page  = Number(query.page)  || 1;
        const limit = Number(query.limit) || 20;
        const skip  = (page - 1) * limit;

        // Build WHERE with only guaranteed-safe fields
        const where: Prisma.SystemLogWhereInput = {};

        // ADMIN không được xem log của SUPER_ADMIN — tương tự ADMIN_VISIBLE_USER_ROLES trong user.service
        if (viewerRole === 'ADMIN') {
            where.OR = [
                { userId: null },                                      // log hệ thống (SYSTEM)
                { user: { is: { role: { not: 'SUPER_ADMIN' } } } },   // mọi role trừ SUPER_ADMIN
            ];
        }

        if (query.action)   where.action   = query.action;
        if (query.resource) where.resource = query.resource;
        if (query.userId)   where.userId   = Number(query.userId);

        const role = normalizeRoleFilter(query.role);
        if (role === 'SYSTEM') {
            where.userId = null;
        } else if (role) {
            where.user = { is: { role } };
        }

        const severityWhere = buildSeverityWhere(query.severity);
        if (severityWhere) {
            where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), severityWhere];
        }

        const search = query.search?.trim();
        if (search) {
            const numericSearch = Number(search.replace(/^#/, '').replace(/^log\s*#/i, '').trim());
            const searchConditions: Prisma.SystemLogWhereInput[] = [
                { description: { contains: search, mode: 'insensitive' } },
                { targetName:  { contains: search, mode: 'insensitive' } },
                { action:      { contains: search, mode: 'insensitive' } },
                { resource:    { contains: search, mode: 'insensitive' } },
                { resourceId:  { contains: search, mode: 'insensitive' } },
                { ipAddress:   { contains: search, mode: 'insensitive' } },
                { user: { is: { fullName: { contains: search, mode: 'insensitive' } } } },
                { user: { is: { email:    { contains: search, mode: 'insensitive' } } } },
            ];

            if (Number.isInteger(numericSearch) && numericSearch > 0) {
                searchConditions.push({ id: numericSearch });
            }

            where.OR = searchConditions;
        }

        const sortOrder: Prisma.SortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
        const sortBy = query.sortBy === 'createdAt' ? query.sortBy : 'createdAt';

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
                orderBy: { [sortBy]: sortOrder },
                include: {
                    user: {
                        select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
                    },
                } as any,
            }) as any);
        } catch (err) {
            console.warn('[ActivityLog] include {user} failed, fallback:', (err)?.message);
            data = await (this.prisma.systemLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
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
    async findOne(id: number, viewerRole?: string) {
        const log = await this.prisma.systemLog.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
                },
            },
        });
        // ADMIN không được xem log của SUPER_ADMIN
        if (viewerRole === 'ADMIN' && log?.user?.role === 'SUPER_ADMIN') {
            return null;
        }
        return log;
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
    async exportCsv(query: LogQueryDto, viewerRole?: string): Promise<string> {
        // Lấy tất cả không giới hạn (với filter)
        const unlimitedQuery = { ...query, limit: 10000, page: 1 };
        const { data } = await this.findAll(unlimitedQuery, viewerRole);

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
