import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, UseGuards, ParseIntPipe,
  UploadedFile, UseInterceptors, BadRequestException, Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request as ExpressRequest } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ArticleService } from './article.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AuditLog } from '../common/decorators/audit-log.decorator';

type JwtRequestUser = {
  id?: number;
  userId?: number;
  sub?: number;
  role?: string;
};

type AuthenticatedRequest = ExpressRequest & {
  user?: JwtRequestUser;
};

const getAuthUserId = (req: AuthenticatedRequest): number | undefined => {
  const rawId = req.user?.id ?? req.user?.userId ?? req.user?.sub;
  return rawId == null ? undefined : Number(rawId);
};

const getAuthRole = (req: AuthenticatedRequest): string | undefined =>
  req.user?.role;

@Controller('article')
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ─── Public endpoints ─────────────────────────────────────────────────────

  /** GET /article — Bài viết đã PUBLISHED (trang khách) */
  @Get()
  async findAll(@Query('category') category?: string) {
    return this.articleService.findAll(category);
  }

  /** GET /article/featured — Bài nổi bật */
  @Get('featured')
  async findFeatured() {
    return this.articleService.findFeatured();
  }

  // ─── Static routes phải TRƯỚC :slug ─────────────────────────────────────

  /** GET /article/admin/pending — Đếm bài chờ duyệt */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('admin/pending')
  async getPendingCount() {
    return this.articleService.getPendingCount();
  }

  /** GET /article/admin/stats — KPI: pending + rejected */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Get('admin/stats')
  async getAdminStats(@Req() req: AuthenticatedRequest) {
    return this.articleService.getAdminStats(getAuthUserId(req), getAuthRole(req));
  }

  /** GET /article/admin/all — Danh sách phân trang, filter, search */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Get('admin/all')
  async adminFindAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.articleService.adminFindAll(
      { page: Number(page), limit: Number(limit), search, category, isFeatured, status, sortBy, sortDir },
      getAuthUserId(req),
      getAuthRole(req),
    );
  }

  /** GET /article/admin/trash — Danh sách thùng rác */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('admin/trash')
  async getTrash(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.articleService.getTrash({ page: Number(page), limit: Number(limit), search });
  }

  /** GET /article/admin/:id — Chi tiết bài viết (kèm content) */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Get('admin/:id')
  async adminFindById(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.adminFindById(id);
  }

  /** POST /article/admin/upload — Upload ảnh qua Cloudinary */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post('admin/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn một file ảnh');
    const result = await this.cloudinaryService.uploadFile(file, 'azure-horizon/articles');
    return { url: result.secure_url };
  }

  /** POST /article/admin/bulk-action - Bulk article actions */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post('admin/bulk-action')
  @AuditLog('UPDATE', 'Article')
  async adminBulkAction(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      ids?: number[];
      action?: 'publish' | 'draft' | 'trash' | 'feature' | 'unfeature' | 'category' | 'submit';
      category?: string;
    },
  ) {
    return this.articleService.adminBulkAction(
      body.ids,
      body.action!,
      getAuthUserId(req),
      getAuthRole(req),
      body.category,
    );
  }

  /** POST /article/admin — Admin/Super Admin lưu nháp hoặc xuất bản ngay; Staff tạo DRAFT */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post('admin')
  @AuditLog('CREATE', 'Article')
  async adminCreate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: {
      slug?: string; title?: string; category?: string; excerpt?: string;
      seoTitle?: string; seoDescription?: string;
      content?: string; imageUrl?: string; author?: string;
      readTime?: number; isFeatured?: boolean;
      saveMode?: 'draft' | 'publish';
    },
  ) {
    return this.articleService.adminCreate(dto, getAuthUserId(req), getAuthRole(req));
  }

  /** POST /article/admin/:id/submit — Staff gửi DRAFT/REJECTED → PENDING_REVIEW */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('STAFF')
  @Post('admin/:id/submit')
  @AuditLog('UPDATE', 'Article')
  async submitForReview(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.articleService.submitForReview(id, getAuthUserId(req)!);
  }

  /** PATCH /article/admin/:id/review — Admin duyệt hoặc từ chối */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('admin/:id/review')
  @AuditLog('UPDATE', 'Article')
  async reviewArticle(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body() body: { action: 'approve' | 'reject'; note?: string },
  ) {
    return this.articleService.reviewArticle(id, getAuthUserId(req)!, body.action, body.note);
  }

  /** PATCH /article/admin/:id — Cập nhật bài viết */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Patch('admin/:id')
  @AuditLog('UPDATE', 'Article')
  async adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: {
      slug?: string; title?: string; category?: string; excerpt?: string;
      seoTitle?: string; seoDescription?: string;
      content?: string; imageUrl?: string; author?: string;
      readTime?: number; isFeatured?: boolean;
      saveMode?: 'draft' | 'publish';
    },
  ) {
    return this.articleService.adminUpdate(id, dto, getAuthUserId(req), getAuthRole(req));
  }

  /** PATCH /article/admin/:id/toggle-featured — Bật/tắt nổi bật */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('admin/:id/toggle-featured')
  @AuditLog('UPDATE', 'Article')
  async adminToggleFeatured(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.adminToggleFeatured(id);
  }

  /** DELETE /article/admin/:id — Xóa bài viết */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete('admin/:id')
  @AuditLog('DELETE', 'Article')
  async adminDelete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.articleService.adminDelete(id, getAuthUserId(req), getAuthRole(req));
  }

  // ─── Trash endpoints ──────────────────────────────────────────────────────

  /** PATCH /article/admin/:id/restore — Khôi phục từ thùng rác */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('admin/:id/restore')
  @AuditLog('UPDATE', 'Article')
  async restoreArticle(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.restoreArticle(id);
  }

  /** DELETE /article/admin/:id/hard-delete — Xóa vĩnh viễn khỏi thùng rác */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete('admin/:id/hard-delete')
  @AuditLog('DELETE', 'Article')
  async hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.hardDelete(id);
  }

  // ─── Public :slug route phải CUỐI ────────────────────────────────────────
  /** GET /article/:slug — Chi tiết bài viết public (chỉ PUBLISHED) */
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.articleService.findBySlug(slug);
  }
}
