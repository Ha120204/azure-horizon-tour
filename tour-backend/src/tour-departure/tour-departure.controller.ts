import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TourDepartureService } from './tour-departure.service';
import type { CreateDepartureDto, UpsertDepartureTransportDto } from './tour-departure.service';

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

@Controller('tour/:tourId/departures')
export class TourDepartureController {
  constructor(private readonly tourDepartureService: TourDepartureService) {}

  /** Public: customer-facing active upcoming departures. */
  @Get()
  findAll(
    @Param('tourId', ParseIntPipe) tourId: number,
    @Query('locale') locale?: string,
  ) {
    return this.tourDepartureService.findByTour(tourId, locale);
  }

  @Post('bulk')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  bulkReplace(
    @Req() req: AuthenticatedRequest,
    @Param('tourId', ParseIntPipe) tourId: number,
    @Body() body: { departures: CreateDepartureDto[] },
  ) {
    return this.tourDepartureService.bulkReplace(
      tourId,
      body.departures ?? [],
      getAuthUserId(req),
      req.user?.role,
    );
  }

  @Get(':departureId/transport')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  getTransport(@Param('departureId', ParseIntPipe) departureId: number) {
    return this.tourDepartureService.getTransport(departureId);
  }

  @Put(':departureId/transport')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  upsertTransport(
    @Req() req: AuthenticatedRequest,
    @Param('tourId', ParseIntPipe) tourId: number,
    @Param('departureId', ParseIntPipe) departureId: number,
    @Body() dto: UpsertDepartureTransportDto,
  ) {
    return this.tourDepartureService.upsertTransport(
      tourId,
      departureId,
      dto,
      getAuthUserId(req),
      req.user?.role,
    );
  }

  @Delete(':departureId/transport')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  deleteTransport(
    @Req() req: AuthenticatedRequest,
    @Param('tourId', ParseIntPipe) tourId: number,
    @Param('departureId', ParseIntPipe) departureId: number,
  ) {
    return this.tourDepartureService.deleteTransport(
      tourId,
      departureId,
      getAuthUserId(req),
      req.user?.role,
    );
  }
}
