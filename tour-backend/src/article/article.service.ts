import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
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

type ArticleDraftInput = {
  title?: string;
  category?: string;
  excerpt?: string;
  content?: string;
  imageUrl?: string;
  author?: string;
  readTime?: number;
  isFeatured?: boolean;
};

function stripHtml(value?: string | null): string {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function requirePublishableArticle(article: ArticleDraftInput) {
  const missing: string[] = [];
  if (!article.title?.trim()) missing.push('tiêu đề');
  if (!article.excerpt?.trim()) missing.push('tóm tắt');
  if (!article.imageUrl?.trim()) missing.push('ảnh bìa');
  if (!article.author?.trim()) missing.push('tác giả');
  if (!stripHtml(article.content) || article.content === '<p><br></p>') missing.push('nội dung');

  if (missing.length) {
    throw new BadRequestException(`Bài viết chưa đủ thông tin để gửi duyệt: ${missing.join(', ')}`);
  }
}

@Injectable()
export class ArticleService {
  constructor(private prisma: PrismaService) {}

  // ─── Public API (trang user — chỉ PUBLISHED) ────────────────────────────────

  async findAll(category?: string) {
    const where: any = { status: ArticleStatus.PUBLISHED, deletedAt: null };
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

  async findFeatured() {
    return this.prisma.article.findFirst({
      where: { isFeatured: true, status: ArticleStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    if (!article || article.status !== ArticleStatus.PUBLISHED) return null;
    return article;
  }

  // ─── Admin API ─────────────────────────────────────────────────────────────

  async getPendingCount(): Promise<{ count: number }> {
    const count = await this.prisma.article.count({
      where: { status: ArticleStatus.PENDING_REVIEW },
    });
    return { count };
  }

  async getAdminStats(requesterId?: number, requesterRole?: string) {
    const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';
    const baseWhere = { deletedAt: null };
    const visibleWhere = isAdmin
      ? baseWhere
      : requesterRole === 'STAFF' && requesterId
        ? {
            ...baseWhere,
            OR: [
              { status: ArticleStatus.PUBLISHED },
              { createdById: requesterId },
            ],
          }
        : { ...baseWhere, status: ArticleStatus.PUBLISHED };
    const statusWhere = (status: ArticleStatus) =>
      isAdmin || status === ArticleStatus.PUBLISHED
        ? { ...baseWhere, status }
        : requesterRole === 'STAFF' && requesterId
          ? { ...baseWhere, status, createdById: requesterId }
          : { ...baseWhere, status, id: -1 };

    const [
      totalVisible,
      published,
      draft,
      pending,
      rejected,
      featured,
      topCategoryRows,
    ] = await Promise.all([
      this.prisma.article.count({ where: visibleWhere }),
      this.prisma.article.count({ where: statusWhere(ArticleStatus.PUBLISHED) }),
      this.prisma.article.count({ where: statusWhere(ArticleStatus.DRAFT) }),
      this.prisma.article.count({
        where: statusWhere(ArticleStatus.PENDING_REVIEW),
      }),
      this.prisma.article.count({
        where: statusWhere(ArticleStatus.REJECTED),
      }),
      this.prisma.article.count({
        where: { ...visibleWhere, isFeatured: true },
      }),
      this.prisma.article.groupBy({
        by: ['category'],
        where: visibleWhere,
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
        take: 1,
      }),
    ]);

    return {
      totalVisible,
      total: totalVisible,
      published,
      draft,
      pending,
      rejected,
      featured,
      topCategory: topCategoryRows[0]
        ? {
            category: topCategoryRows[0].category,
            count: topCategoryRows[0]._count.category,
          }
        : null,
    };
  }

  async adminFindAll(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      isFeatured?: string;
      status?: string;
    },
    requesterId?: number,
    requesterRole?: string,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null }; // Luôn loại trừ bài đã vào thùng rác

    // Phân quyền visibility
    const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';
    if (!isAdmin && requesterRole === 'STAFF' && requesterId) {
      // Staff chỉ thấy bài của mình
      if (query.status && Object.values(ArticleStatus).includes(query.status as ArticleStatus)) {
        where.status = query.status as ArticleStatus;
        if (query.status !== ArticleStatus.PUBLISHED) {
          where.createdById = requesterId;
        }
      } else {
        where.OR = [
          { status: ArticleStatus.PUBLISHED },
          { createdById: requesterId },
        ];
      }
    } else if (isAdmin) {
      // Admin thấy tất cả, có thể filter theo status
      if (query.status && Object.values(ArticleStatus).includes(query.status as ArticleStatus)) {
        where.status = query.status as ArticleStatus;
      }
    }

    if (query.search) {
      const searchFilter = {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { author: { contains: query.search, mode: 'insensitive' } },
        ],
      };
      where.AND = Array.isArray(where.AND)
        ? [...where.AND, searchFilter]
        : where.AND
          ? [where.AND, searchFilter]
          : [searchFilter];
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
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, slug: true, category: true, title: true,
          excerpt: true, imageUrl: true, author: true,
          readTime: true, isFeatured: true, publishedAt: true,
          createdAt: true, status: true, reviewNote: true,
          createdById: true,
          createdBy: { select: { id: true, fullName: true } },
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

  async adminFindById(id: number) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!article) throw new NotFoundException('Bài viết không tồn tại');
    return article;
  }

  /** Admin/Staff tạo bài — Admin: PUBLISHED; Staff: DRAFT */
  async adminCreate(
    dto: ArticleDraftInput,
    creatorId?: number,
    creatorRole?: string,
  ) {
    const isAdmin = creatorRole === 'ADMIN' || creatorRole === 'SUPER_ADMIN';
    if (isAdmin) requirePublishableArticle(dto);

    const title = dto.title?.trim() ?? '';
    const slugSeed = title || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const baseSlug = generateSlug(slugSeed);
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.article.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const status: ArticleStatus = isAdmin ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT;

    return this.prisma.article.create({
      data: {
        slug,
        title,
        category: (dto.category || 'GUIDES').toUpperCase(),
        excerpt: dto.excerpt?.trim() ?? '',
        content: dto.content ?? '',
        imageUrl: dto.imageUrl?.trim() ?? '',
        author: dto.author?.trim() ?? '',
        readTime: dto.readTime ?? 1,
        isFeatured: dto.isFeatured ?? false,
        status,
        publishedAt: isAdmin ? new Date() : null,
        ...(creatorId && { createdBy: { connect: { id: creatorId } } }),
      },
    });
  }

  /** Staff gửi bài DRAFT hoặc REJECTED → PENDING_REVIEW */
  async submitForReview(id: number, staffId: number) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Bài viết không tồn tại');

    // Nếu createdById là null (bài viết tạo trước khi thêm cột), cho phép Staff chỉnh sửa
    // Nếu đã có createdById thì kiểm tra chính xác owner
    if (article.createdById !== null && article.createdById !== staffId) {
      throw new ForbiddenException('Bạn không có quyền gửi duyệt bài viết này');
    }
    if (article.status !== ArticleStatus.DRAFT && article.status !== ArticleStatus.REJECTED) {
      throw new BadRequestException(`Bài viết đang ở trạng thái "${article.status}", không thể gửi duyệt`);
    }
    requirePublishableArticle(article);

    return this.prisma.article.update({
      where: { id },
      data: { status: ArticleStatus.PENDING_REVIEW, reviewNote: null },
    });
  }

  /** Admin duyệt hoặc từ chối bài viết */
  async reviewArticle(
    id: number,
    reviewerId: number,
    action: 'approve' | 'reject',
    note?: string,
  ) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Bài viết không tồn tại');

    if (article.status !== ArticleStatus.PENDING_REVIEW) {
      throw new BadRequestException(`Bài viết đang ở trạng thái "${article.status}", không thể duyệt`);
    }
    if (action === 'reject' && !note?.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối');
    }

    const updateData: any = {
      status: action === 'approve' ? ArticleStatus.PUBLISHED : ArticleStatus.REJECTED,
      reviewNote: action === 'reject' ? (note ?? null) : null,
      // Khi từ chối: KHÔNG đặt publishedAt = null vì có thể DB còn NOT NULL constraint
      // Khi duyệt: set publishedAt = now
      ...(action === 'approve' && { publishedAt: new Date() }),
      // Chỉ connect reviewedBy nếu có reviewerId hợp lệ
      ...(reviewerId && { reviewedBy: { connect: { id: reviewerId } } }),
    };

    return this.prisma.article.update({
      where: { id },
      data: updateData,
    });
  }

  async adminUpdate(
    id: number,
    dto: ArticleDraftInput,
    requesterId?: number,
    requesterRole?: string,
  ) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bài viết không tồn tại');

    const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';

    // Staff chỉ sửa bài của mình ở DRAFT hoặc REJECTED
    if (!isAdmin) {
      // Nếu createdById không null, kiểm tra owner; nếu null (bài cũ trước migration) cho phép tiếp tục
      if (existing.createdById !== null && existing.createdById !== requesterId) {
        throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài viết này');
      }
      if (existing.status !== ArticleStatus.DRAFT && existing.status !== ArticleStatus.REJECTED) {
        throw new ForbiddenException('Chỉ có thể chỉnh sửa bài viết ở trạng thái Nháp hoặc Bị từ chối');
      }
    }

    const updateData: any = {
      ...dto,
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt.trim() }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl.trim() }),
      ...(dto.author !== undefined && { author: dto.author.trim() }),
      ...(dto.readTime !== undefined && { readTime: dto.readTime || 1 }),
    };
    if (dto.category) updateData.category = dto.category.toUpperCase();

    if (dto.title?.trim() && dto.title.trim() !== existing.title) {
      const baseSlug = generateSlug(dto.title.trim());
      let slug = baseSlug;
      let suffix = 1;
      while (
        await this.prisma.article.findFirst({ where: { slug, NOT: { id } } })
      ) {
        slug = `${baseSlug}-${suffix++}`;
      }
      updateData.slug = slug;
    }

    return this.prisma.article.update({ where: { id }, data: updateData });
  }

  async adminDelete(id: number, requesterId?: number, requesterRole?: string) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bài viết không tồn tại');

    const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Chỉ Admin mới có thể xóa bài viết');
    }
    // Soft delete — chuyển vào thùng rác
    await this.prisma.article.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: `Đã chuyển "${existing.title}" vào thùng rác` };
  }

  /** Lấy danh sách thùng rác (Admin only) */
  async getTrash(
    query: { page?: number; limit?: number; search?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: { not: null } };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { author: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [articles, totalItems] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deletedAt: 'desc' },
        select: {
          id: true, slug: true, title: true, category: true,
          excerpt: true, imageUrl: true, author: true,
          deletedAt: true, status: true, createdAt: true,
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

  /** Khôi phục bài viết từ thùng rác */
  async restoreArticle(id: number) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing || !existing.deletedAt) {
      throw new NotFoundException('Bài viết không có trong thùng rác');
    }
    await this.prisma.article.update({
      where: { id },
      data: { deletedAt: null },
    });
    return { message: `Đã khôi phục "${existing.title}"` };
  }

  /** Xóa vĩnh viễn khỏi thùng rác */
  async hardDelete(id: number) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing || !existing.deletedAt) {
      throw new NotFoundException('Bài viết không có trong thùng rác');
    }
    await this.prisma.article.delete({ where: { id } });
    return { message: `Đã xóa vĩnh viễn "${existing.title}"` };
  }

  async adminToggleFeatured(id: number) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bài viết không tồn tại');
    if (existing.status !== ArticleStatus.PUBLISHED) {
      throw new BadRequestException('Chỉ có thể đặt nổi bật bài viết đã được duyệt');
    }
    return this.prisma.article.update({
      where: { id },
      data: { isFeatured: !existing.isFeatured },
    });
  }
}
