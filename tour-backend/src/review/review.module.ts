import { Module } from '@nestjs/common';
import { ReviewController, ReviewAdminController } from './review.controller';
import { ReviewService } from './review.service';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [ReviewController, ReviewAdminController],
  providers: [ReviewService],
})
export class ReviewModule {}

