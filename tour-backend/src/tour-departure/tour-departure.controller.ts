import {
    Controller, Get, Post,
    Param, Body, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TourDepartureService } from './tour-departure.service';
import type { CreateDepartureDto } from './tour-departure.service';

@Controller('tour/:tourId/departures')
export class TourDepartureController {
    constructor(private readonly tourDepartureService: TourDepartureService) {}

    /** GET /tour/:tourId/departures — Public */
    @Get()
    findAll(@Param('tourId', ParseIntPipe) tourId: number) {
        return this.tourDepartureService.findByTour(tourId);
    }

    /** POST /tour/:tourId/departures/bulk — Admin: bulk replace */
    @Post('bulk')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
    bulkReplace(
        @Param('tourId', ParseIntPipe) tourId: number,
        @Body() body: { departures: CreateDepartureDto[] },
    ) {
        return this.tourDepartureService.bulkReplace(tourId, body.departures ?? []);
    }
}
