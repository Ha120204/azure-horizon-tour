import { Module } from '@nestjs/common';
import { TourService } from './tour.service';
import { TourController } from './tour.controller';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

import { TourCronService } from './tour.cron';

@Module({
  imports: [CloudinaryModule],
  controllers: [TourController],
  providers: [TourService, TourCronService],
})
export class TourModule {}

