import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Put,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TourService } from './tour.service';
import { TourPermissionService } from './tour-permission.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { FilterTourDto } from './dto/filter-tour.dto';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';

type AuthUser = {
  id?: number | string;
  userId?: number | string;
  sub?: number | string;
  role?: string;
};

type AuthenticatedRequest = {
  user?: AuthUser;
};

type ItineraryDayUpdateBody = {
  title?: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  mealsBreakfast?: boolean;
  mealsLunch?: boolean;
  mealsDinner?: boolean;
  accommodation?: string;
  accommodationEn?: string;
  transport?: string;
  transportEn?: string;
  activities?: string[];
  activitiesEn?: string[];
  imageUrl?: string;
  timeline?: unknown[];
  timelineEn?: unknown[];
};

type ItineraryDayUpsertBody = ItineraryDayUpdateBody & {
  dayNumber?: number;
  title: string;
  description: string;
};

const getAuthUserId = (req: AuthenticatedRequest): number | undefined => {
  const rawId = req.user?.id ?? req.user?.userId ?? req.user?.sub;
  return rawId == null ? undefined : Number(rawId);
};

const getAuthRole = (req: AuthenticatedRequest): string | undefined =>
  req.user?.role;

@Controller('tour')
export class TourController {
  constructor(
    private readonly tourService: TourService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly tourPermission: TourPermissionService,
  ) {}

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
    @Req() req: AuthenticatedRequest,
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
      const result = await this.cloudinaryService.uploadFile(
        file,
        'azure-horizon/tours',
      );
      createTourDto.imageUrl = result.secure_url;
    }
    const creatorId = getAuthUserId(req);
    const creatorRole = getAuthRole(req);
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
  findAll(@Query() query: FilterTourDto, @Req() req: AuthenticatedRequest, @Query('locale') locale?: string) {
    const requesterId = getAuthUserId(req);
    const requesterRole = getAuthRole(req);
    return this.tourService.findAll(query, requesterId, requesterRole, locale);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Get('admin/stats')
  getAdminStats(@Req() req: AuthenticatedRequest) {
    return this.tourService.getAdminStats(getAuthUserId(req), getAuthRole(req));
  }

  @Get('sale-deals')
  getSaleDeals(@Query('locale') locale?: string) {
    return this.tourService.getSaleDeals(locale);
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
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('deletable') deletable?: string,
  ) {
    return this.tourService.getTrashedTours(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      { search, status, deletable },
    );
  }

  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Query('locale') locale?: string,
  ) {
    return this.tourService.findOne(
      id,
      getAuthUserId(req),
      getAuthRole(req),
      locale,
    );
  }

  @Get(':id/rating-stats')
  getRatingStats(@Param('id', ParseIntPipe) id: number) {
    return this.tourService.getRatingStats(id);
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
    @Req() req: AuthenticatedRequest,
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
      const result = await this.cloudinaryService.uploadFile(
        file,
        'azure-horizon/tours',
      );
      updateTourDto.imageUrl = result.secure_url;
    }
    const requesterId = getAuthUserId(req);
    const requesterRole = getAuthRole(req);
    return this.tourService.update(
      +id,
      updateTourDto,
      requesterId,
      requesterRole,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Delete(':id')
  @AuditLog('DELETE', 'Tour')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.tourService.remove(+id, getAuthUserId(req), getAuthRole(req));
  }

  // ── Trash Management ─────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('trash/bulk-restore')
  @AuditLog('UPDATE', 'Tour')
  bulkRestoreTours(@Body() body: { ids?: number[] }) {
    return this.tourService.bulkRestoreTours((body.ids ?? []).map(Number));
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete('trash/bulk-permanent')
  @AuditLog('DELETE', 'Tour')
  bulkPermanentDelete(@Body() body: { ids?: number[] }) {
    return this.tourService.bulkPermanentDelete((body.ids ?? []).map(Number));
  }

  /** PATCH /tour/:id/restore — Khôi phục tour từ Trash về PENDING_REVIEW (Admin) */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/restore')
  @AuditLog('UPDATE', 'Tour')
  restoreTour(@Param('id') id: string) {
    return this.tourService.restoreTour(+id);
  }

  /** DELETE /tour/:id/permanent — Xóa vĩnh viễn tour chưa có booking */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
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
  submitForReview(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.tourService.submitForReview(+id, getAuthUserId(req)!);
  }

  /**
   * PATCH /tour/:id/publish
   * Admin/Super Admin xac nhan public tour da luu nhap len trang khach hang.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/publish')
  @AuditLog('UPDATE', 'Tour')
  publishTour(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.tourService.publishTour(+id, getAuthUserId(req)!);
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
    @Req() req: AuthenticatedRequest,
    @Body() body: { action: 'approve' | 'reject'; note?: string },
  ) {
    return this.tourService.reviewTour(
      +id,
      getAuthUserId(req)!,
      body.action,
      body.note,
    );
  }

  // ── Gallery ─────────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadGallery(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    await this.tourPermission.assertCanMutateTour(
      +id,
      getAuthUserId(req),
      getAuthRole(req),
    );
    const urls = await this.cloudinaryService.uploadFiles(
      files,
      'azure-horizon/tours/gallery',
    );
    return this.tourService.addGalleryImages(
      +id,
      urls,
      getAuthUserId(req),
      getAuthRole(req),
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Delete(':id/images/:imageId')
  removeGalleryImage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.tourService.removeGalleryImage(
      +id,
      +imageId,
      getAuthUserId(req),
      getAuthRole(req),
    );
  }

  // ── Highlights ──────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Put(':id/highlights')
  upsertHighlights(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      highlights: { content: string; contentEn?: string; icon?: string; sortOrder?: number }[];
    },
  ) {
    return this.tourService.upsertHighlights(
      +id,
      body.highlights ?? [],
      getAuthUserId(req),
      getAuthRole(req),
    );
  }

  // ── FAQs ────────────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Put(':id/faqs')
  upsertFaqs(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: { faqs: { question: string; questionEn?: string; answer: string; answerEn?: string; sortOrder?: number }[] },
  ) {
    return this.tourService.upsertFaqs(
      +id,
      body.faqs ?? [],
      getAuthUserId(req),
      getAuthRole(req),
    );
  }

  // ── Itinerary ───────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Put(':id/itinerary')
  upsertItinerary(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { itinerary?: ItineraryDayUpsertBody[] },
  ) {
    return this.tourService.upsertItinerary(
      +id,
      body.itinerary ?? [],
      getAuthUserId(req),
      getAuthRole(req),
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Patch(':id/itinerary/:dayId')
  updateItineraryDay(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('dayId') dayId: string,
    @Body() data: ItineraryDayUpdateBody,
  ) {
    return this.tourService.updateItineraryDay(
      +id,
      +dayId,
      data,
      getAuthUserId(req),
      getAuthRole(req),
    );
  }
}
