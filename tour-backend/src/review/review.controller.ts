import {
  Controller, Post, Get, Body, Param, Query, UseGuards, Req,
  ParseIntPipe, DefaultValuePipe, UseInterceptors, UploadedFiles,
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AuthGuard } from '@nestjs/passport';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

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

  /**
   * Tạo Review mới.
   * - Nếu gửi JSON thuần với mảng imageUrls string → hoạt động như cũ.
   * - Nếu gửi multipart/form-data kèm file ảnh (field 'images', tối đa 5 file)
   *   → upload lên Cloudinary, mỗi file tối đa 5MB, chỉ nhận .jpg/.jpeg/.png
   */
  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(FilesInterceptor('images', 5)) // Tối đa 5 ảnh
  async createReview(
    @Param('tourId', ParseIntPipe) tourId: number,
    @Req() req: any,
    @Body() createReviewDto: CreateReviewDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
        fileIsRequired: false, // Cho phép không gửi file (dùng imageUrls string cũ)
      }),
    )
    files?: Express.Multer.File[],
  ) {
    // Nếu có file upload, đẩy lên Cloudinary và gộp vào imageUrls

    if (files && files.length > 0) {
      const uploadedUrls = await this.cloudinaryService.uploadFiles(files, 'azure-horizon/reviews');
      // Gộp URLs từ Cloudinary với imageUrls có sẵn từ body (nếu có)
      createReviewDto.imageUrls = [
        ...(createReviewDto.imageUrls || []),
        ...uploadedUrls,
      ];
    }
    return this.reviewService.createReview(req.user.userId, tourId, createReviewDto);
  }
}
