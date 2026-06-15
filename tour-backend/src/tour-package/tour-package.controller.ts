import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuperAdminArea } from '../auth/decorators/super-admin-area.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TourPackageService } from './tour-package.service';
import type { CreatePackageDto } from './tour-package.service';

type AuthenticatedRequest = {
  user?: {
    id?: number | string;
    userId?: number | string;
    sub?: number | string;
    role?: string;
  };
};

const getAuthUserId = (req: AuthenticatedRequest): number | undefined => {
  const rawId = req.user?.id ?? req.user?.userId ?? req.user?.sub;
  return rawId == null ? undefined : Number(rawId);
};

@SuperAdminArea('tours')
@Controller('tour/:tourId/packages')
export class TourPackageController {
  constructor(private readonly svc: TourPackageService) {}

  /** Public: customer-facing active packages. */
  @Get()
  findAll(@Param('tourId', ParseIntPipe) tourId: number, @Query('locale') locale?: string) {
    return this.svc.findByTour(tourId, locale);
  }

  /** Internal editor read: same authorization as tour update. */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  @Get('admin')
  findAllAdmin(
    @Req() req: AuthenticatedRequest,
    @Param('tourId', ParseIntPipe) tourId: number,
  ) {
    return this.svc.findByTourAdmin(tourId, getAuthUserId(req), req.user?.role);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Param('tourId', ParseIntPipe) tourId: number,
    @Body() dto: CreatePackageDto,
  ) {
    return this.svc.create(tourId, dto, getAuthUserId(req), req.user?.role);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  @Post('bulk')
  bulkReplace(
    @Req() req: AuthenticatedRequest,
    @Param('tourId', ParseIntPipe) tourId: number,
    @Body() body: { packages: CreatePackageDto[] },
  ) {
    return this.svc.bulkReplace(
      tourId,
      body.packages ?? [],
      getAuthUserId(req),
      req.user?.role,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('tourId', ParseIntPipe) tourId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreatePackageDto>,
  ) {
    return this.svc.update(tourId, id, dto, getAuthUserId(req), req.user?.role);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('tourId', ParseIntPipe) tourId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.remove(tourId, id, getAuthUserId(req), req.user?.role);
  }
}
