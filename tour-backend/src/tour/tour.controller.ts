import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, UseInterceptors, UploadedFile, UploadedFiles,
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Put,
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

@Controller('tour')
export class TourController {
  constructor(
    private readonly tourService: TourService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  /**
   * Tạo Tour mới.
   * - Nếu gửi JSON thuần với imageUrl string → hoạt động như cũ.
   * - Nếu gửi multipart/form-data kèm file ảnh (field 'image') → upload lên Cloudinary.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post()
  @AuditLog('CREATE', 'Tour')
  @UseInterceptors(FileInterceptor('image'))
  async create(
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
    return this.tourService.create(createTourDto);
  }

  @Get()
  findAll(@Query() query: FilterTourDto) {
    return this.tourService.findAll(query);
  }

  @Get('sale-deals')
  getSaleDeals() {
    return this.tourService.getSaleDeals();
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
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Patch(':id')
  @AuditLog('UPDATE', 'Tour')
  @UseInterceptors(FileInterceptor('image'))
  async update(
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
    return this.tourService.update(+id, updateTourDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Delete(':id')
  @AuditLog('DELETE', 'Tour')
  remove(@Param('id') id: string) {
    return this.tourService.remove(+id);
  }

  // ── Gallery ─────────────────────────────────────────────────────

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
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Delete(':id/images/:imageId')
  removeGalleryImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.tourService.removeGalleryImage(+id, +imageId);
  }

  // ── Highlights ──────────────────────────────────────────────────

  /**
   * PUT /tour/:id/highlights
   * Body: { highlights: [{ content, icon?, sortOrder? }] }
   * Thay thế toàn bộ highlights của tour bằng danh sách mới.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Put(':id/highlights')
  upsertHighlights(
    @Param('id') id: string,
    @Body() body: { highlights: { content: string; icon?: string; sortOrder?: number }[] },
  ) {
    return this.tourService.upsertHighlights(+id, body.highlights ?? []);
  }

  // ── FAQs ────────────────────────────────────────────────────────

  /**
   * PUT /tour/:id/faqs
   * Body: { faqs: [{ question, answer, sortOrder? }] }
   * Thay thế toàn bộ FAQs của tour bằng danh sách mới.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Put(':id/faqs')
  upsertFaqs(
    @Param('id') id: string,
    @Body() body: { faqs: { question: string; answer: string; sortOrder?: number }[] },
  ) {
    return this.tourService.upsertFaqs(+id, body.faqs ?? []);
  }

  // ── Itinerary ───────────────────────────────────────────────────

  /**
   * PATCH /tour/:id/itinerary/:dayId
   * Cập nhật thông tin chi tiết cho 1 ngày trong lịch trình.
   */
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
