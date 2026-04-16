import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArticleService } from './article.service';

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

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

  /** GET /article/:slug — Lấy chi tiết bài viết theo slug */
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.articleService.findBySlug(slug);
  }
}
