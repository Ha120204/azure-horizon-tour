import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

@Injectable()
export class ArticleService {
  constructor(private prisma: PrismaService) {}

  // ─── Public API (dùng cho trang user) ────────────────────────────────────

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
        id: true, slug: true, category: true, title: true,
        excerpt: true, imageUrl: true, author: true,
        readTime: true, isFeatured: true, publishedAt: true,
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
    return this.prisma.article.findUnique({ where: { slug } });
  }

  // ─── Admin API ────────────────────────────────────────────────────────────

  /** Admin: Lấy danh sách bài viết với phân trang, search, filter */
  async adminFindAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isFeatured?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { author: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category && query.category !== 'ALL') {
      where.category = query.category;
    }
    if (query.isFeatured === 'true') where.isFeatured = true;
    if (query.isFeatured === 'false') where.isFeatured = false;

    const [articles, totalItems] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true, slug: true, category: true, title: true,
          excerpt: true, imageUrl: true, author: true,
          readTime: true, isFeatured: true, publishedAt: true, createdAt: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      articles,
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  /** Admin: Lấy chi tiết bài viết theo id (kèm cả content để edit) */
  async adminFindById(id: number) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Bài viết không tồn tại');
    return article;
  }

  /** Admin: Tạo bài viết mới */
  async adminCreate(dto: {
    title: string;
    category: string;
    excerpt: string;
    content: string;
    imageUrl: string;
    author: string;
    readTime?: number;
    isFeatured?: boolean;
  }) {
    const baseSlug = generateSlug(dto.title);
    // Đảm bảo slug không trùng
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.article.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    return this.prisma.article.create({
      data: {
        slug,
        title: dto.title,
        category: dto.category.toUpperCase(),
        excerpt: dto.excerpt,
        content: dto.content,
        imageUrl: dto.imageUrl,
        author: dto.author,
        readTime: dto.readTime ?? 5,
        isFeatured: dto.isFeatured ?? false,
        publishedAt: new Date(),
      },
    });
  }

  /** Admin: Cập nhật bài viết */
  async adminUpdate(
    id: number,
    dto: {
      title?: string;
      category?: string;
      excerpt?: string;
      content?: string;
      imageUrl?: string;
      author?: string;
      readTime?: number;
      isFeatured?: boolean;
    },
  ) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bài viết không tồn tại');

    const updateData: any = { ...dto };
    if (dto.category) updateData.category = dto.category.toUpperCase();

    // Nếu title thay đổi, update slug
    if (dto.title && dto.title !== existing.title) {
      const baseSlug = generateSlug(dto.title);
      let slug = baseSlug;
      let suffix = 1;
      while (
        await this.prisma.article.findFirst({
          where: { slug, NOT: { id } },
        })
      ) {
        slug = `${baseSlug}-${suffix++}`;
      }
      updateData.slug = slug;
    }

    return this.prisma.article.update({ where: { id }, data: updateData });
  }

  /** Admin: Xóa bài viết */
  async adminDelete(id: number) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bài viết không tồn tại');
    await this.prisma.article.delete({ where: { id } });
    return { message: `Đã xóa bài viết "${existing.title}"` };
  }

  /** Admin: Toggle isFeatured */
  async adminToggleFeatured(id: number) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bài viết không tồn tại');
    return this.prisma.article.update({
      where: { id },
      data: { isFeatured: !existing.isFeatured },
    });
  }
}
