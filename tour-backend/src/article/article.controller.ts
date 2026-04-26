import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, UseGuards, ParseIntPipe,
  UploadedFile, UseInterceptors, BadRequestException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArticleService } from './article.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

@Controller('article')
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  // ─── Public endpoints ─────────────────────────────────────────────────────

  /** GET /article — Lấy danh sách bài viết (hỗ trợ ?category=GUIDES) */
  @Get()
  async findAll(@Query('category') category?: string) {
    return this.articleService.findAll(category);
  }

  /** GET /article/featured — Lấy bài viết nổi bật */
  @Get('featured')
  async findFeatured() {
    return this.articleService.findFeatured();
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  /** GET /article/admin/all — Danh sách phân trang, filter, search */
  @UseGuards(AuthGuard('jwt'))
  @Get('admin/all')
  async adminFindAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isFeatured') isFeatured?: string,
  ) {
    return this.articleService.adminFindAll({ page: Number(page), limit: Number(limit), search, category, isFeatured });
  }

  /** GET /article/admin/:id — Chi tiết bài viết (kèm content) */
  @UseGuards(AuthGuard('jwt'))
  @Get('admin/:id')
  async adminFindById(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.adminFindById(id);
  }

  /** POST /article/admin/upload — Upload ảnh bìa/nội dung qua Cloudinary */
  @UseGuards(AuthGuard('jwt'))
  @Post('admin/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn một file ảnh');
    const result = await this.cloudinaryService.uploadFile(file, 'azure-horizon/articles');
    return { url: result.secure_url };
  }

  /** POST /article/admin — Tạo bài viết mới */
  @UseGuards(AuthGuard('jwt'))
  @Post('admin')
  async adminCreate(@Body() dto: {
    title: string; category: string; excerpt: string;
    content: string; imageUrl: string; author: string;
    readTime?: number; isFeatured?: boolean;
  }) {
    return this.articleService.adminCreate(dto);
  }

  /** PATCH /article/admin/:id — Cập nhật bài viết */
  @UseGuards(AuthGuard('jwt'))
  @Patch('admin/:id')
  async adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: {
      title?: string; category?: string; excerpt?: string;
      content?: string; imageUrl?: string; author?: string;
      readTime?: number; isFeatured?: boolean;
    },
  ) {
    return this.articleService.adminUpdate(id, dto);
  }

  /** PATCH /article/admin/:id/toggle-featured — Bật/tắt nổi bật */
  @UseGuards(AuthGuard('jwt'))
  @Patch('admin/:id/toggle-featured')
  async adminToggleFeatured(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.adminToggleFeatured(id);
  }

  /** DELETE /article/admin/:id — Xóa bài viết */
  @UseGuards(AuthGuard('jwt'))
  @Delete('admin/:id')
  async adminDelete(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.adminDelete(id);
  }

  /** GET /article/:slug — Lấy chi tiết theo slug (public) — ĐẶT CUỐI để tránh conflict */
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.articleService.findBySlug(slug);
  }
}
