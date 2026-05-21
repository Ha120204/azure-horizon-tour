import { Module } from '@nestjs/common';
import { TourService } from './tour.service';
import { TourController } from './tour.controller';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { TourPermissionService } from './tour-permission.service';

import { TourCronService } from './tour.cron';

@Module({
  imports: [CloudinaryModule],
  controllers: [TourController],
  providers: [TourService, TourCronService, TourPermissionService],
  exports: [TourPermissionService],
})
export class TourModule {}

