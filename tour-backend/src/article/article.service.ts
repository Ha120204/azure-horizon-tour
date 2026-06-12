import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ArticleStatus, Prisma } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../prisma/prisma.service';

// Whitelist khớp với bộ format của trình soạn thảo Quill ở admin (QUILL_FORMATS):
// header(h1-3), bold/italic/underline/strike, blockquote, list, link, image, align.
function sanitizeArticleContent(html?: string): string {
  if (!html) return html ?? '';
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's',
      'blockquote', 'ol', 'ul', 'li', 'a', 'img',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
      // Quill lưu căn lề bằng class ql-align-* trên block element
      p: ['class'], h1: ['class'], h2: ['class'], h3: ['class'],
      blockquote: ['class'], li: ['data-list', 'class'],
    },
    allowedClasses: {
      '*': ['ql-align-center', 'ql-align-right', 'ql-align-justify'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
    },
  });
}

function normalizeLocale(locale?: string): 'vi' | 'en' {
  return locale === 'en' ? 'en' : 'vi';
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// Trả bản tiếng Anh khi locale='en' (fallback về tiếng Việt nếu field En trống).
// Luôn loại bỏ các field *En khỏi response trả về client.
function localizeArticle<
  T extends {
    title?: string;
    titleEn?: string | null;
    excerpt?: string;
    excerptEn?: string | null;
    content?: string;
    contentEn?: string | null;
  },
>(article: T, locale: 'vi' | 'en') {
  const { titleEn, excerptEn, contentEn, ...rest } = article;
  if (locale !== 'en') return rest;
  return {
    ...rest,
    ...(hasText(titleEn) && { title: titleEn }),
    ...(hasText(excerptEn) && { excerpt: excerptEn }),
    ...(hasText(contentEn) && { content: contentEn }),
  };
}

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
  slug?: string;
  title?: string;
  titleEn?: string | null;
  category?: string;
  excerpt?: string;
  excerptEn?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  content?: string;
  contentEn?: string | null;
  imageUrl?: string;
  author?: string;
  readTime?: number;
  isFeatured?: boolean;
  saveMode?: 'draft' | 'publish';
};

type ArticleBulkAction =
  | 'publish'
  | 'draft'
  | 'trash'
  | 'feature'
  | 'unfeature'
  | 'category'
  | 'submit';

function normalizeBulkIds(ids?: number[]): number[] {
  return [...new Set((ids ?? []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
}

function stripHtml(value?: string | null): string {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function normalizeArticleSlug(value: string): string {
  return generateSlug(value).replace(/^-+|-+$/g, '');
}

function requirePublishableArticle(article: ArticleDraftInput) {
  const missing: string[] = [];
  if (!article.title?.trim()) missing.push('tiêu đề');
  if (!article.excerpt?.trim()) missing.push('tóm tắt');
  if (!article.imageUrl?.trim()) missing.push('ảnh bìa');
  if (!article.author?.trim()) missing.push('tác giả');
  if (!stripHtml(article.content) || article.content === '<p><br></p>') missing.push('nội dung');

  if (missing.length) {
    throw new BadRequestException(`Bài viết chưa đủ thông tin để xuất bản: ${missing.join(', ')}`);
  }
}

@Injectable()
export class ArticleService {
  constructor(private prisma: PrismaService) {}

  // ─── Public API (trang user — chỉ PUBLISHED) ────────────────────────────────

  async findAll(category?: string, page = 1, limit = 6, localeInput?: string) {
    const locale = normalizeLocale(localeInput);
    // Bài nổi bật hiển thị riêng ở hero (findFeatured) → loại khỏi lưới để phân trang đều
    const where: Prisma.ArticleWhereInput = {
      status: ArticleStatus.PUBLISHED,
      deletedAt: null,
      isFeatured: false,
    };
    if (category && category !== 'ALL') {
      where.category = category;
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const skip = (safePage - 1) * safeLimit;

    const [articles, totalItems] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true, slug: true, category: true, title: true, titleEn: true,
          excerpt: true, excerptEn: true, seoTitle: true, seoDescription: true,
          imageUrl: true, author: true, readTime: true, isFeatured: true, publishedAt: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: articles.map((article) => localizeArticle(article, locale)),
      meta: {
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / safeLimit)),
        currentPage: safePage,
        itemsPerPage: safeLimit,
      },
    };
  }

  async findFeatured(localeInput?: string) {
    const locale = normalizeLocale(localeInput);
    const article = await this.prisma.article.findFirst({
      where: {
        isFeatured: true,
        status: ArticleStatus.PUBLISHED,
        deletedAt: null,
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true, slug: true, category: true, title: true, titleEn: true,
        excerpt: true, excerptEn: true, seoTitle: true, seoDescription: true,
        imageUrl: true, author: true, readTime: true, isFeatured: true, publishedAt: true,
      },
    });
    return article ? localizeArticle(article, locale) : null;
  }

  async findBySlug(slug: string, localeInput?: string) {
    const locale = normalizeLocale(localeInput);
    const article = await this.prisma.article.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, category: true, title: true, titleEn: true,
        excerpt: true, excerptEn: true, content: true, contentEn: true,
        seoTitle: true, seoDescription: true,
        imageUrl: true, author: true, readTime: true, isFeatured: true,
        publishedAt: true, status: true, deletedAt: true,
      },
    });
    if (
      !article ||
      article.status !== ArticleStatus.PUBLISHED ||
      article.deletedAt
    ) {
      return null;
    }
    return localizeArticle(article, locale);
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
    const baseWhere: Prisma.ArticleWhereInput = { deletedAt: null };
    const visibleWhere: Prisma.ArticleWhereInput = isAdmin
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
    const statusWhere = (status: ArticleStatus): Prisma.ArticleWhereInput =>
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
      sortBy?: string;
      sortDir?: string;
    },
    requesterId?: number,
    requesterRole?: string,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ArticleWhereInput = { deletedAt: null }; // Luôn loại trừ bài đã vào thùng rác

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
      const searchFilter: Prisma.ArticleWhereInput = {
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

    const sortableFields = ['title', 'category', 'author', 'publishedAt', 'status', 'isFeatured'] as const;
    type ArticleSortField = (typeof sortableFields)[number];
    const sortBy: ArticleSortField = sortableFields.includes(query.sortBy as ArticleSortField)
      ? query.sortBy as ArticleSortField
      : 'publishedAt';
    const sortDir: Prisma.SortOrder = query.sortDir === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.ArticleOrderByWithRelationInput[] = sortBy === 'publishedAt'
      ? [{ publishedAt: sortDir }, { updatedAt: sortDir }, { createdAt: sortDir }]
      : [{ [sortBy]: sortDir } as Prisma.ArticleOrderByWithRelationInput, { createdAt: 'desc' }];

    const [articles, totalItems] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true, slug: true, category: true, title: true,
          excerpt: true, seoTitle: true, seoDescription: true, imageUrl: true, author: true,
          readTime: true, isFeatured: true, publishedAt: true,
          createdAt: true, updatedAt: true, status: true, reviewNote: true,
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

  /** Admin/Super Admin tạo nháp hoặc xuất bản ngay; Staff tạo DRAFT */
  async adminCreate(
    dto: ArticleDraftInput,
    creatorId?: number,
    creatorRole?: string,
  ) {
    const isAdmin = creatorRole === 'ADMIN' || creatorRole === 'SUPER_ADMIN';
    const saveMode = dto.saveMode === 'draft' ? 'draft' : 'publish';
    const shouldPublish = isAdmin && saveMode === 'publish';
    if (shouldPublish) requirePublishableArticle(dto);

    const title = dto.title?.trim() ?? '';
    const slugSeed = dto.slug?.trim() || title || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const baseSlug = normalizeArticleSlug(slugSeed);
    if (!baseSlug) throw new BadRequestException('Slug không hợp lệ');
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.article.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const status: ArticleStatus = shouldPublish ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT;

    return this.prisma.article.create({
      data: {
        slug,
        title,
        titleEn: dto.titleEn?.trim() || null,
        category: (dto.category || 'GUIDES').toUpperCase(),
        excerpt: dto.excerpt?.trim() ?? '',
        excerptEn: dto.excerptEn?.trim() || null,
        seoTitle: dto.seoTitle?.trim() || null,
        seoDescription: dto.seoDescription?.trim() || null,
        content: sanitizeArticleContent(dto.content),
        contentEn: hasText(dto.contentEn) ? sanitizeArticleContent(dto.contentEn) : null,
        imageUrl: dto.imageUrl?.trim() ?? '',
        author: dto.author?.trim() ?? '',
        readTime: dto.readTime ?? 1,
        isFeatured: dto.isFeatured ?? false,
        status,
        publishedAt: shouldPublish ? new Date() : null,
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

    const updateData: Prisma.ArticleUpdateInput = {
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

    const { saveMode, ...articleData } = dto;
    const wantsDraft = isAdmin && saveMode === 'draft';
    const wantsPublish = isAdmin && saveMode === 'publish';
    const publishCandidate: ArticleDraftInput = { ...existing, ...articleData };
    if (wantsPublish) requirePublishableArticle(publishCandidate);

    const updateData: Prisma.ArticleUpdateInput = {};
    if (dto.slug !== undefined) updateData.slug = normalizeArticleSlug(dto.slug);
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.category !== undefined) {
      updateData.category = dto.category ? dto.category.toUpperCase() : dto.category;
    }
    if (dto.titleEn !== undefined) updateData.titleEn = String(dto.titleEn ?? '').trim() || null;
    if (dto.excerpt !== undefined) updateData.excerpt = dto.excerpt.trim();
    if (dto.excerptEn !== undefined) updateData.excerptEn = String(dto.excerptEn ?? '').trim() || null;
    if (dto.seoTitle !== undefined) updateData.seoTitle = String(dto.seoTitle ?? '').trim() || null;
    if (dto.seoDescription !== undefined) {
      updateData.seoDescription = String(dto.seoDescription ?? '').trim() || null;
    }
    if (dto.content !== undefined) updateData.content = sanitizeArticleContent(dto.content);
    if (dto.contentEn !== undefined) {
      updateData.contentEn = hasText(dto.contentEn) ? sanitizeArticleContent(dto.contentEn) : null;
    }
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl.trim();
    if (dto.author !== undefined) updateData.author = dto.author.trim();
    if (dto.readTime !== undefined) updateData.readTime = dto.readTime || 1;
    if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;

    if (dto.slug !== undefined) {
      const baseSlug = normalizeArticleSlug(dto.slug);
      if (!baseSlug) throw new BadRequestException('Slug không hợp lệ');
      let slug = baseSlug;
      let suffix = 1;
      while (
        await this.prisma.article.findFirst({ where: { slug, NOT: { id } } })
      ) {
        slug = `${baseSlug}-${suffix++}`;
      }
      updateData.slug = slug;
    } else if (dto.title?.trim() && dto.title.trim() !== existing.title) {
      const baseSlug = normalizeArticleSlug(dto.title.trim());
      let slug = baseSlug;
      let suffix = 1;
      while (
        await this.prisma.article.findFirst({ where: { slug, NOT: { id } } })
      ) {
        slug = `${baseSlug}-${suffix++}`;
      }
      updateData.slug = slug;
    }

    if (wantsDraft) {
      updateData.status = ArticleStatus.DRAFT;
      updateData.publishedAt = null;
      updateData.reviewNote = null;
    } else if (wantsPublish) {
      updateData.status = ArticleStatus.PUBLISHED;
      updateData.publishedAt = existing.publishedAt ?? new Date();
      updateData.reviewNote = null;
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
  async adminBulkAction(
    ids: number[] | undefined,
    action: ArticleBulkAction,
    requesterId?: number,
    requesterRole?: string,
    category?: string,
  ) {
    const articleIds = normalizeBulkIds(ids);
    if (articleIds.length === 0) {
      throw new BadRequestException('Vui long chon it nhat mot bai viet');
    }

    const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';
    const isStaff = requesterRole === 'STAFF';
    const adminOnlyActions: ArticleBulkAction[] = ['publish', 'draft', 'trash', 'feature', 'unfeature', 'category'];
    if (adminOnlyActions.includes(action) && !isAdmin) {
      throw new ForbiddenException('Chi Admin moi co the thuc hien thao tac nay');
    }
    if (action === 'submit' && !isStaff) {
      throw new ForbiddenException('Chi nhan vien moi co the gui duyet hang loat');
    }

    const articles = await this.prisma.article.findMany({
      where: { id: { in: articleIds }, deletedAt: null },
    });
    const baseSkipped = articleIds.length - articles.length;
    const now = new Date();

    if (action === 'trash') {
      const result = await this.prisma.article.updateMany({
        where: { id: { in: articles.map((article) => article.id) }, deletedAt: null },
        data: { deletedAt: now },
      });
      return {
        action,
        requested: articleIds.length,
        updated: result.count,
        skipped: articleIds.length - result.count,
      };
    }

    if (action === 'draft') {
      const result = await this.prisma.article.updateMany({
        where: { id: { in: articles.map((article) => article.id) }, deletedAt: null },
        data: {
          status: ArticleStatus.DRAFT,
          publishedAt: null,
          reviewNote: null,
          isFeatured: false,
        },
      });
      return {
        action,
        requested: articleIds.length,
        updated: result.count,
        skipped: articleIds.length - result.count,
      };
    }

    if (action === 'feature' || action === 'unfeature') {
      const eligibleIds = articles
        .filter((article) => article.status === ArticleStatus.PUBLISHED)
        .map((article) => article.id);
      const result = await this.prisma.article.updateMany({
        where: { id: { in: eligibleIds }, deletedAt: null },
        data: { isFeatured: action === 'feature' },
      });
      return {
        action,
        requested: articleIds.length,
        updated: result.count,
        skipped: articleIds.length - result.count,
      };
    }

    if (action === 'category') {
      const normalizedCategory = category?.trim().toUpperCase();
      const allowedCategories = ['GUIDES', 'INSPIRATION', 'CULTURE', 'GASTRONOMY'];
      if (!normalizedCategory || !allowedCategories.includes(normalizedCategory)) {
        throw new BadRequestException('Danh muc bai viet khong hop le');
      }
      const result = await this.prisma.article.updateMany({
        where: { id: { in: articles.map((article) => article.id) }, deletedAt: null },
        data: { category: normalizedCategory },
      });
      return {
        action,
        requested: articleIds.length,
        updated: result.count,
        skipped: articleIds.length - result.count,
      };
    }

    if (action === 'publish') {
      const eligibleArticles = articles.filter((article) => {
        try {
          requirePublishableArticle(article);
          return true;
        } catch {
          return false;
        }
      });
      if (eligibleArticles.length > 0) {
        await this.prisma.$transaction(
          eligibleArticles.map((article) =>
            this.prisma.article.update({
              where: { id: article.id },
              data: {
                status: ArticleStatus.PUBLISHED,
                publishedAt: article.publishedAt ?? now,
                reviewNote: null,
              },
            }),
          ),
        );
      }
      return {
        action,
        requested: articleIds.length,
        updated: eligibleArticles.length,
        skipped: articleIds.length - eligibleArticles.length,
      };
    }

    if (action === 'submit') {
      const eligibleArticles = articles.filter((article) => {
        if (!requesterId) return false;
        if (article.createdById !== null && article.createdById !== requesterId) return false;
        if (article.status !== ArticleStatus.DRAFT && article.status !== ArticleStatus.REJECTED) return false;
        try {
          requirePublishableArticle(article);
          return true;
        } catch {
          return false;
        }
      });
      const result = await this.prisma.article.updateMany({
        where: { id: { in: eligibleArticles.map((article) => article.id) }, deletedAt: null },
        data: { status: ArticleStatus.PENDING_REVIEW, reviewNote: null },
      });
      return {
        action,
        requested: articleIds.length,
        updated: result.count,
        skipped: baseSkipped + (articles.length - eligibleArticles.length),
      };
    }

    throw new BadRequestException('Thao tac hang loat khong hop le');
  }

  async getTrash(
    query: { page?: number; limit?: number; search?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const where: Prisma.ArticleWhereInput = { deletedAt: { not: null } };
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
          excerpt: true, seoTitle: true, seoDescription: true, imageUrl: true, author: true,
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
