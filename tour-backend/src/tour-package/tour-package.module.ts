import { Module } from '@nestjs/common';
import { TourPackageController } from './tour-package.controller';
import { TourPackagePresetController } from './tour-package-preset.controller';
import { TourPackagePresetService } from './tour-package-preset.service';
import { TourPackageService } from './tour-package.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TourModule } from '../tour/tour.module';

@Module({
  imports: [PrismaModule, TourModule],
  controllers: [TourPackageController, TourPackagePresetController],
  providers: [TourPackageService, TourPackagePresetService],
  exports: [TourPackageService, TourPackagePresetService],
})
export class TourPackageModule {}
