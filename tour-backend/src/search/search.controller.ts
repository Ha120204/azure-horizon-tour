import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SearchService } from './search.service';


@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /search/destinations
   * Returns all destinations for suggestion dropdowns.
   */
  @Get('destinations')
  async getAllDestinations(
    @Query('travelScope') travelScope?: string,
    @Query('locale') locale?: string,
  ) {
    return this.searchService.getAllDestinations(travelScope, locale);
  }

  /**
   * POST /search/destinations
   * Create a destination from the admin tour form.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post('destinations')
  async createDestination(
    @Body() body: { name: string; travelScope?: string; countryCode?: string },
  ) {
    return this.searchService.createDestination(body);
  }

  /**
   * GET /search/price-range
   * Returns min/max tour price.
   */
  @Get('price-range')
  async getPriceRange() {
    return this.searchService.getPriceRange();
  }

  /**
   * GET /search
   * Live search destinations and tours. Matches Vietnamese names with or without accents.
   */
  @Get()
  async liveSearch(
    @Query('q') query: string,
    @Query('travelScope') travelScope?: string,
    @Query('locale') locale?: string,
  ) {
    return this.searchService.liveSearch(query, travelScope, locale);
  }
}
