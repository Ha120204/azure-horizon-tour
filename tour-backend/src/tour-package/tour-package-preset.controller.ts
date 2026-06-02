import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TourPackagePresetService } from './tour-package-preset.service';
import type { CreatePackagePresetDto } from './tour-package-preset.service';

type AuthenticatedRequest = {
  user?: {
    id?: number | string;
    userId?: number | string;
    sub?: number | string;
  };
};

const getAuthUserId = (req: AuthenticatedRequest): number | undefined => {
  const rawId = req.user?.id ?? req.user?.userId ?? req.user?.sub;
  return rawId == null ? undefined : Number(rawId);
};

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('tour/package-presets')
export class TourPackagePresetController {
  constructor(private readonly svc: TourPackagePresetService) {}

  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  @Get()
  findByType(@Query('type') type?: string) {
    return this.svc.findByType(type);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePackagePresetDto) {
    return this.svc.create(dto, getAuthUserId(req));
  }
}
