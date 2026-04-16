import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArticleService {
  constructor(private prisma: PrismaService) {}

  /** Lấy tất cả bài viết, hỗ trợ lọc theo category */
  async findAll(category?: string) {
    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }

    return this.prisma.article.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        category: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        author: true,
        readTime: true,
        isFeatured: true,
        publishedAt: true,
      },
    });
  }

  /** Lấy bài viết nổi bật (isFeatured = true) */
  async findFeatured() {
    return this.prisma.article.findFirst({
      where: { isFeatured: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  /** Lấy chi tiết bài viết theo slug */
  async findBySlug(slug: string) {
    return this.prisma.article.findUnique({
      where: { slug },
    });
  }
}
