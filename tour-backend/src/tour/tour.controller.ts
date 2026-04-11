import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TourService } from './tour.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';

@Controller('tour')
export class TourController {
  constructor(private readonly tourService: TourService) { }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post()
  create(@Body() createTourDto: CreateTourDto) {
    return this.tourService.create(createTourDto);
  }

  @Get()
  findAll() {
    return this.tourService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tourService.findOne(+id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTourDto: UpdateTourDto) {
    return this.tourService.update(+id, updateTourDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tourService.remove(+id);
  }
}
