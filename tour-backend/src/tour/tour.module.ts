import { Module } from '@nestjs/common';
import { TourService } from './tour.service';
import { TourController } from './tour.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { TourPermissionService } from './tour-permission.service';
import { TourCronService } from './tour.cron';
import { TourWorkflowService } from './tour-workflow.service';
import { TourContentService } from './tour-content.service';
import { TourQueryService } from './tour-query.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [CloudinaryModule, AiModule],
  controllers: [TourController],
  providers: [TourService, TourCronService, TourPermissionService, TourWorkflowService, TourContentService, TourQueryService],
  exports: [TourPermissionService, TourWorkflowService, TourContentService, TourQueryService],
})
export class TourModule {}
