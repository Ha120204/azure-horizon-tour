import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('tour/:tourId/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  async getReviews(
    @Param('tourId', ParseIntPipe) tourId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.reviewService.getTourReviews(tourId, page, limit);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createReview(
    @Param('tourId', ParseIntPipe) tourId: number,
    @Req() req: any,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewService.createReview(req.user.userId, tourId, createReviewDto);
  }
}

