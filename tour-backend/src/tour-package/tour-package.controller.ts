import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TourPackageService } from './tour-package.service';
import type { CreatePackageDto } from './tour-package.service';

@Controller('tour/:tourId/packages')
export class TourPackageController {
  constructor(private readonly svc: TourPackageService) {}

  /** GET /tour/:tourId/packages — Public: khách xem packages khi vào trang detail */
  @Get()
  findAll(@Param('tourId', ParseIntPipe) tourId: number) {
    return this.svc.findByTour(tourId);
  }

  /** GET /tour/:tourId/packages/admin — Admin: xem cả inactive */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  @Get('admin')
  findAllAdmin(@Param('tourId', ParseIntPipe) tourId: number) {
    return this.svc.findByTourAdmin(tourId);
  }

  /** POST /tour/:tourId/packages — Tạo mới 1 package */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  @Post()
  create(
    @Param('tourId', ParseIntPipe) tourId: number,
    @Body() dto: CreatePackageDto,
  ) {
    return this.svc.create(tourId, dto);
  }

  /** POST /tour/:tourId/packages/bulk — Bulk replace toàn bộ packages */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  @Post('bulk')
  bulkReplace(
    @Param('tourId', ParseIntPipe) tourId: number,
    @Body() body: { packages: CreatePackageDto[] },
  ) {
    return this.svc.bulkReplace(tourId, body.packages ?? []);
  }

  /** PATCH /tour/:tourId/packages/:id — Cập nhật 1 package */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreatePackageDto>,
  ) {
    return this.svc.update(id, dto);
  }

  /** DELETE /tour/:tourId/packages/:id — Xóa 1 package */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
