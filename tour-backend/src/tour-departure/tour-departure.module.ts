import { Module } from '@nestjs/common';
import { TourDepartureService } from './tour-departure.service';
import { TourDepartureController } from './tour-departure.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TourDepartureController],
    providers: [TourDepartureService],
    exports: [TourDepartureService],
})
export class TourDepartureModule {}
