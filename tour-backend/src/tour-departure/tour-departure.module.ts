import { Module } from '@nestjs/common';
import { TourDepartureService } from './tour-departure.service';
import { TourDepartureController } from './tour-departure.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TourModule } from '../tour/tour.module';

@Module({
    imports: [PrismaModule, TourModule],
    controllers: [TourDepartureController],
    providers: [TourDepartureService],
    exports: [TourDepartureService],
})
export class TourDepartureModule {}
