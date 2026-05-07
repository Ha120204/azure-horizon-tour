import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, UseInterceptors, UploadedFile, UploadedFiles,
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Put, Req,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TourService } from './tour.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { FilterTourDto } from './dto/filter-tour.dto';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';

@Controller('tour')
export class TourController {
  constructor(
    private readonly tourService: TourService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  /**
   * Tạo Tour mới.
   * - ADMIN/SUPER_ADMIN: tạo thẳng PUBLISHED.
   * - STAFF: tạo với status DRAFT, chờ Admin duyệt.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post()
  @AuditLog('CREATE', 'Tour')
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Req() req: any,
    @Body() createTourDto: CreateTourDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    if (file) {
      const result = await this.cloudinaryService.uploadFile(file, 'azure-horizon/tours');
      createTourDto.imageUrl = result.secure_url;
    }
    const creatorId: number = req.user?.id;
    const creatorRole: string = req.user?.role;
    return this.tourService.create(createTourDto, creatorId, creatorRole);
  }

  /**
   * Lấy danh sách tour.
   * - Public (không auth): chỉ thấy PUBLISHED.
   * - STAFF (auth): chỉ thấy tour do mình tạo (DRAFT/PENDING/REJECTED/PUBLISHED).
   * - ADMIN/SUPER_ADMIN (auth): thấy tất cả mọi trạng thái.
   *
   * OptionalJwtGuard: populate req.user nếu có token, không throw nếu không có.
   */
  @UseGuards(OptionalJwtGuard)
  @Get()
  findAll(@Query() query: FilterTourDto, @Req() req: any) {
    const requesterId: number | undefined = req.user?.id;
    const requesterRole: string | undefined = req.user?.role;
    return this.tourService.findAll(query, requesterId, requesterRole);
  }

  @Get('sale-deals')
  getSaleDeals() {
    return this.tourService.getSaleDeals();
  }

  /**
   * Lấy danh sách tour đang PENDING_REVIEW.
   * Chỉ ADMIN và SUPER_ADMIN.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('pending')
  getPendingTours() {
    return this.tourService.getPendingTours();
  }

  /** GET /tour/trash — Xem danh sách tour đã bị ẩn (Admin) */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('trash')
  getTrashedTours(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tourService.getTrashedTours(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tourService.findOne(+id);
  }

  @Get(':id/rating-stats')
  getRatingStats(@Param('id') id: string) {
    return this.tourService.getRatingStats(+id);
  }

  /**
   * Cập nhật Tour.
   * - ADMIN/SUPER_ADMIN: cập nhật bất kỳ tour nào.
   * - STAFF: chỉ được cập nhật tour của chính mình ở trạng thái DRAFT/REJECTED.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Patch(':id')
  @AuditLog('UPDATE', 'Tour')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateTourDto: UpdateTourDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    if (file) {
      const result = await this.cloudinaryService.uploadFile(file, 'azure-horizon/tours');
      updateTourDto.imageUrl = result.secure_url;
    }
    const requesterId: number = req.user?.id;
    const requesterRole: string = req.user?.role;
    return this.tourService.update(+id, updateTourDto, requesterId, requesterRole);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @AuditLog('DELETE', 'Tour')
  remove(@Param('id') id: string) {
    return this.tourService.remove(+id);
  }

  // ── Trash Management ─────────────────────────────────────

  /** PATCH /tour/:id/restore — Khôi phục tour từ Trash về PENDING_REVIEW (Admin) */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/restore')
  @AuditLog('UPDATE', 'Tour')
  restoreTour(@Param('id') id: string) {
    return this.tourService.restoreTour(+id);
  }

  /** DELETE /tour/:id/permanent — Xóa vĩnh viễn khỏi DB (chỉ Super Admin) */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id/permanent')
  @AuditLog('DELETE', 'Tour')
  permanentDelete(@Param('id') id: string) {
    return this.tourService.permanentDelete(+id);
  }

  // ── Workflow: Submit for Review ─────────────────────────────────────

  /**
   * POST /tour/:id/submit
   * Staff gửi tour để Admin duyệt → PENDING_REVIEW.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('STAFF')
  @Post(':id/submit')
  @AuditLog('UPDATE', 'Tour')
  submitForReview(@Param('id') id: string, @Req() req: any) {
    return this.tourService.submitForReview(+id, req.user?.id);
  }

  /**
   * PATCH /tour/:id/review
   * Admin duyệt hoặc từ chối tour.
   * Body: { action: 'approve' | 'reject', note?: string }
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/review')
  @AuditLog('UPDATE', 'Tour')
  reviewTour(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { action: 'approve' | 'reject'; note?: string },
  ) {
    return this.tourService.reviewTour(+id, req.user?.id, body.action, body.note);
  }

  // ── Gallery ─────────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadGallery(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const urls = await this.cloudinaryService.uploadFiles(files, 'azure-horizon/tours/gallery');
    return this.tourService.addGalleryImages(+id, urls);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id/images/:imageId')
  removeGalleryImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.tourService.removeGalleryImage(+id, +imageId);
  }

  // ── Highlights ──────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Put(':id/highlights')
  upsertHighlights(
    @Param('id') id: string,
    @Body() body: { highlights: { content: string; icon?: string; sortOrder?: number }[] },
  ) {
    return this.tourService.upsertHighlights(+id, body.highlights ?? []);
  }

  // ── FAQs ────────────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Put(':id/faqs')
  upsertFaqs(
    @Param('id') id: string,
    @Body() body: { faqs: { question: string; answer: string; sortOrder?: number }[] },
  ) {
    return this.tourService.upsertFaqs(+id, body.faqs ?? []);
  }

  // ── Itinerary ───────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Patch(':id/itinerary/:dayId')
  updateItineraryDay(
    @Param('id') id: string,
    @Param('dayId') dayId: string,
    @Body() data: any,
  ) {
    return this.tourService.updateItineraryDay(+id, +dayId, data);
  }
}
