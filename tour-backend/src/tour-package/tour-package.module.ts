import { Module } from '@nestjs/common';
import { TourPackageController } from './tour-package.controller';
import { TourPackageService } from './tour-package.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TourModule } from '../tour/tour.module';

@Module({
  imports: [PrismaModule, TourModule],
  controllers: [TourPackageController],
  providers: [TourPackageService],
  exports: [TourPackageService],
})
export class TourPackageModule {}
