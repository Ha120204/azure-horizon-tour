import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AdminQueryReviewDto, AdminReplyDto } from './dto/admin-query-review.dto';
import { AuthGuard } from '@nestjs/passport';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

type AuthUser = {
  id?: number | string;
  userId?: number | string;
  sub?: number | string;
};

type AuthenticatedRequest = {
  user?: AuthUser;
};

const getAuthUserId = (req: AuthenticatedRequest): number => {
  const rawId = req.user?.userId ?? req.user?.id ?? req.user?.sub;
  return Number(rawId);
};

// ─── Customer Routes: /tour/:tourId/reviews ───────────────────────────────────

@Controller('tour/:tourId/reviews')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  async getReviews(
    @Param('tourId', ParseIntPipe) tourId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
    @Query('sortBy') sortBy?: string,
    @Query('filter') filter?: string,
  ) {
    return this.reviewService.getTourReviews(tourId, page, limit, sortBy, filter);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(FilesInterceptor('images', 5))
  async createReview(
    @Param('tourId', ParseIntPipe) tourId: number,
    @Req() req: AuthenticatedRequest,
    @Body() createReviewDto: CreateReviewDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ) {
    if (files && files.length > 0) {
      const uploadedUrls = await this.cloudinaryService.uploadFiles(
        files,
        'azure-horizon/reviews',
      );
      createReviewDto.imageUrls = [
        ...(createReviewDto.imageUrls || []),
        ...uploadedUrls,
      ];
    }
    return this.reviewService.createReview(
      getAuthUserId(req),
      tourId,
      createReviewDto,
    );
  }
}

// ─── Admin Routes: /review/admin ─────────────────────────────────────────────

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('review/admin')
export class ReviewAdminController {
  constructor(private readonly reviewService: ReviewService) {}

  /** GET /review/admin/stats — Thống kê tổng quan */
  @Get('stats')
  getStats() {
    return this.reviewService.getAdminStats();
  }

  /** GET /review/admin/all — Lấy tất cả reviews với filter, paginate */
  @Get('all')
  getAllReviews(@Query() query: AdminQueryReviewDto) {
    return this.reviewService.getAllReviewsAdmin(query);
  }

  /** PATCH /review/admin/:id/visibility — Toggle ẩn/hiện */
  @Patch(':id/visibility')
  toggleVisibility(@Param('id', ParseIntPipe) id: number) {
    return this.reviewService.toggleVisibility(id);
  }

  /** PATCH /review/admin/:id/reply — Admin phản hồi review */
  @Patch(':id/reply')
  replyReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminReplyDto,
  ) {
    return this.reviewService.replyReview(id, dto.content);
  }

  /** DELETE /review/admin/:id — Xóa review */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteReview(@Param('id', ParseIntPipe) id: number) {
    return this.reviewService.deleteReview(id);
  }

  /** POST /review/admin/bulk/hide — Ẩn nhiều review */
  @Post('bulk/hide')
  bulkHide(@Body('ids') ids: number[]) {
    return this.reviewService.bulkToggleVisibility(ids, true);
  }

  /** POST /review/admin/bulk/show — Hiện nhiều review */
  @Post('bulk/show')
  bulkShow(@Body('ids') ids: number[]) {
    return this.reviewService.bulkToggleVisibility(ids, false);
  }

  /** POST /review/admin/bulk/delete — Xóa nhiều review */
  @Post('bulk/delete')
  bulkDelete(@Body('ids') ids: number[]) {
    return this.reviewService.bulkDelete(ids);
  }
}
