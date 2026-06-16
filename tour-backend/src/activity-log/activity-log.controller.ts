import { Controller, Get, Param, Query, Res, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ActivityLogService, LogQueryDto } from './activity-log.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLog } from '../common/decorators/audit-log.decorator';

type AuthenticatedRequest = { user: { role: string } };

@Controller('admin/logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class ActivityLogController {
    constructor(private readonly logService: ActivityLogService) {}

    // GET /admin/logs/stats — KPI summary
    @Get('stats')
    async getStats(@Request() req: AuthenticatedRequest) {
        const stats = await this.logService.getStats(req.user.role);
        return { data: stats };
    }

    // GET /admin/logs/export — Download CSV
    @Get('export')
    @Roles('SUPER_ADMIN')
    @AuditLog('EXPORT', 'SystemLog')
    async exportCsv(@Query() query: LogQueryDto, @Res() res: Response, @Request() req: AuthenticatedRequest) {
        const csv = await this.logService.exportCsv(query, req.user.role);
        const fileName = `nhat-ky-${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(csv);
    }

    // GET /admin/logs — Danh sách với filter + pagination
    @Get()
    async findAll(@Query() query: LogQueryDto, @Request() req: AuthenticatedRequest) {
        return this.logService.findAll(query, req.user.role);
    }

    // GET /admin/logs/:id — Chi tiết 1 log
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
        const log = await this.logService.findOne(id, req.user.role);
        return { data: log };
    }
}
