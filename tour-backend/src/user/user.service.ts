import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentStatus, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const ADMIN_VISIBLE_USER_ROLES: Role[] = [Role.CUSTOMER, Role.STAFF];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown email error';
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Tạo user mới (Admin tạo tài khoản Staff/Admin)
   */
  async createUser(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: Role;
    sendEmail?: boolean;
  }, requesterRole: Role) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException('Email đã tồn tại trong hệ thống');

    // Không cho phép tạo tài khoản SUPER_ADMIN
    if (data.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Không thể tạo tài khoản SUPER_ADMIN');
    }

    if (requesterRole !== Role.SUPER_ADMIN && data.role !== Role.STAFF) {
      throw new ForbiddenException('Admin chỉ được tạo tài khoản Staff');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        phone: data.phone || null,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (data.sendEmail) {
      // Dùng hàm sendWelcomeEmail mặc định hoặc sendEmail chung
      // Ở đây call mailService.sendWelcomeEmail nếu có, hoặc log.
      try {
        await this.mailService.sendWelcomeEmail(user.email, user.fullName, data.password);
      } catch (err) {
        console.error('Failed to send welcome email:', getErrorMessage(err));
      }
    }

    return user;
  }

  /**
   * Lấy danh sách users có phân trang, tìm kiếm, filter
   */
  async findAll(query: {
    search?: string;
    role?: string;
    status?: string;
    bookingFilter?: string;
    segmentFilter?: string;
    sortBy?: string;
    sortDir?: string;
    page?: number;
    limit?: number;
  }, requesterRole?: Role) {
    const { search, role, status, bookingFilter, segmentFilter, sortBy, sortDir, page = 1, limit = 10 } = query;

    const where: Prisma.UserWhereInput = {};
    const andConditions: Prisma.UserWhereInput[] = [];

    // Tìm kiếm theo tên hoặc email
    if (search) {
      const numericSearch = Number(search);
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        ...(Number.isInteger(numericSearch) ? [{ id: numericSearch }] : []),
      ];
    }

    const requestedRoles = role
      ? (role
          .split(',')
          .map((r) => r.trim())
          .filter((r) => Object.values(Role).includes(r as Role)) as Role[])
      : [];

    if (
      requesterRole === Role.STAFF &&
      requestedRoles.length > 0 &&
      !requestedRoles.includes(Role.CUSTOMER)
    ) {
      return {
        data: [],
        meta: {
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
        },
      };
    }

    // Filter theo role (hỗ trợ nhiều role cách nhau bằng dấu phẩy: role=STAFF,ADMIN)
    if (role) {
      if (requesterRole === Role.STAFF) {
        where.role = Role.CUSTOMER;
      } else if (requesterRole === Role.ADMIN) {
        const allowedRoles = requestedRoles.filter((r) =>
          ADMIN_VISIBLE_USER_ROLES.includes(r),
        );
        if (allowedRoles.length === 0) {
          return {
            data: [],
            meta: {
              totalItems: 0,
              totalPages: 0,
              currentPage: page,
            },
          };
        }
        where.role =
          allowedRoles.length === 1 ? allowedRoles[0] : { in: allowedRoles };
      } else if (requestedRoles.length === 1) {
        where.role = requestedRoles[0];
      } else if (requestedRoles.length > 1) {
        where.role = { in: requestedRoles };
      }
    } else if (requesterRole === Role.STAFF) {
      where.role = Role.CUSTOMER;
    } else if (requesterRole === Role.ADMIN) {
      where.role = { in: ADMIN_VISIBLE_USER_ROLES };
    }

    // Filter theo status (active = deletedAt is null, deactivated = deletedAt is not null)
    if (status === 'active') {
      where.deletedAt = null;
    } else if (status === 'deactivated') {
      where.deletedAt = { not: null };
    }

    if (bookingFilter === 'has_bookings') {
      where.bookings = { some: { deletedAt: null } };
    } else if (bookingFilter === 'no_bookings') {
      where.bookings = { none: { deletedAt: null } };
    }

    const now = new Date();
    if (segmentFilter === 'new_7_days') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      andConditions.push({ createdAt: { gte: sevenDaysAgo } });
    } else if (segmentFilter === 'new_30_days') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      andConditions.push({ createdAt: { gte: thirtyDaysAgo } });
    } else if (segmentFilter === 'has_phone') {
      andConditions.push({ phone: { not: null } }, { phone: { not: '' } });
    } else if (segmentFilter === 'missing_phone') {
      andConditions.push({ OR: [{ phone: null }, { phone: '' }] });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const direction: Prisma.SortOrder = sortDir === 'asc' ? 'asc' : 'desc';
    let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: direction };
    if (sortBy === 'fullName') {
      orderBy = { fullName: direction };
    } else if (sortBy === 'bookingCount') {
      orderBy = { bookings: { _count: direction } };
    } else if (sortBy === 'reviewCount') {
      orderBy = { reviews: { _count: direction } };
    } else if (sortBy === 'status') {
      orderBy = { deletedAt: direction };
    }

    const [users, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
          deletedAt: true,
          authRevokedAt: true,
          _count: {
            select: {
              bookings: true,
              reviews: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);
    const [spendSummary, recentBookingSummary] = userIds.length
      ? await Promise.all([
          this.prisma.booking.groupBy({
            by: ['userId'],
            where: {
              userId: { in: userIds },
              deletedAt: null,
              paymentStatus: PaymentStatus.PAID,
            },
            _sum: { totalPrice: true },
          }),
          this.prisma.booking.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds }, deletedAt: null },
            _max: { createdAt: true },
          }),
        ])
      : [[], []];

    const spendByUser = new Map(
      spendSummary.map((item) => [item.userId, Number(item._sum.totalPrice ?? 0)]),
    );
    const lastBookingByUser = new Map(
      recentBookingSummary.map((item) => [item.userId, item._max.createdAt]),
    );

    return {
      data: users.map((u) => ({
        ...u,
        status: u.deletedAt ? 'Deactivated' : 'Active',
        bookingCount: u._count.bookings,
        reviewCount: u._count.reviews,
        totalSpent: spendByUser.get(u.id) ?? 0,
        lastBookingAt: lastBookingByUser.get(u.id) ?? null,
      })),
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  /**
   * Chi tiết 1 user
   */
  async findOne(id: number, requesterRole?: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        dob: true,
        gender: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        authRevokedAt: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Lấy thêm thông tin booking gần nhất
    if (requesterRole === Role.STAFF && user.role !== Role.CUSTOMER) {
      throw new NotFoundException('User not found');
    }

    if (
      requesterRole === Role.ADMIN &&
      !ADMIN_VISIBLE_USER_ROLES.includes(user.role)
    ) {
      throw new NotFoundException('User not found');
    }

    const [recentBookings, paidBookingSummary, lastBookingSummary] =
      await Promise.all([
        this.prisma.booking.findMany({
          where: { userId: id, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            bookingCode: true,
            totalPrice: true,
            status: true,
            createdAt: true,
            tour: { select: { name: true } },
          },
        }),
        this.prisma.booking.aggregate({
          where: {
            userId: id,
            deletedAt: null,
            paymentStatus: PaymentStatus.PAID,
          },
          _sum: { totalPrice: true },
        }),
        this.prisma.booking.aggregate({
          where: { userId: id, deletedAt: null },
          _max: { createdAt: true },
        }),
      ]);

    return {
      ...user,
      status: user.deletedAt ? 'Deactivated' : 'Active',
      bookingCount: user._count.bookings,
      reviewCount: user._count.reviews,
      totalSpent: Number(paidBookingSummary._sum.totalPrice ?? 0),
      lastBookingAt: lastBookingSummary._max.createdAt ?? null,
      recentBookings,
    };
  }

  /**
   * Đổi role user — chỉ SUPER_ADMIN mới được gọi
   */
  async updateRole(id: number, newRole: Role, requesterId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Không được tự đổi role chính mình
    if (user.id === requesterId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    // Không cho phép chuyển thành SUPER_ADMIN
    if (newRole === 'SUPER_ADMIN') {
      throw new ForbiddenException('Không thể chuyển role thành SUPER_ADMIN');
    }

    // Không cho phép đổi role của SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Không thể thay đổi role của SUPER_ADMIN');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        role: newRole,
        authTokenVersion: { increment: 1 },
        authRevokedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        authRevokedAt: true,
      },
    });

    return updated;
  }

  /**
   * Cập nhật thông tin cơ bản của user (từ Admin)
   */
  async updateUser(id: number, data: { fullName?: string; phone?: string; dob?: string; gender?: string; }, requesterRole: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Không thể chỉnh sửa tài khoản SUPER_ADMIN');
    }

    if (
      requesterRole !== Role.SUPER_ADMIN &&
      !ADMIN_VISIBLE_USER_ROLES.includes(user.role)
    ) {
      throw new ForbiddenException('Admin chi duoc chinh sua tai khoan Customer/Staff');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: data.fullName !== undefined ? data.fullName : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        dob: data.dob !== undefined ? data.dob : undefined,
        gender: data.gender !== undefined ? data.gender : undefined,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        dob: true,
        gender: true,
        role: true,
      },
    });

    return updated;
  }

  /**
   * Activate / Deactivate user (toggle deletedAt)
   */
  async toggleStatus(id: number, requesterId: number, requesterRole: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Không được tự deactivate chính mình
    if (user.id === requesterId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Không thể vô hiệu hóa tài khoản SUPER_ADMIN');
    }

    if (
      requesterRole !== Role.SUPER_ADMIN &&
      !ADMIN_VISIBLE_USER_ROLES.includes(user.role)
    ) {
      throw new ForbiddenException('Admin chi duoc thay doi trang thai tai khoan Customer/Staff');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: user.deletedAt ? null : new Date(),
        ...(!user.deletedAt
          ? {
              authTokenVersion: { increment: 1 },
              authRevokedAt: new Date(),
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        deletedAt: true,
        authRevokedAt: true,
      },
    });

    return {
      ...updated,
      status: updated.deletedAt ? 'Deactivated' : 'Active',
    };
  }

  async bulkUpdateUserStatus(
    ids: number[],
    status: 'active' | 'deactivated',
    requesterId: number,
    requesterRole: Role,
    targetRole: Role = Role.CUSTOMER,
  ) {
    const uniqueIds = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
    if (uniqueIds.length === 0) {
      return { updatedCount: 0, skippedCount: 0, status, role: targetRole };
    }

    if (uniqueIds.includes(requesterId)) {
      throw new ForbiddenException('You cannot change your own account status');
    }

    if (requesterRole !== Role.SUPER_ADMIN && requesterRole !== Role.ADMIN) {
      throw new ForbiddenException('Only Admin and Super Admin can update account status');
    }

    if (targetRole === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Bulk actions cannot update SUPER_ADMIN accounts');
    }

    if (
      requesterRole !== Role.SUPER_ADMIN &&
      !ADMIN_VISIBLE_USER_ROLES.includes(targetRole)
    ) {
      throw new ForbiddenException('Admin chi duoc thay doi trang thai tai khoan Customer/Staff');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, role: true, deletedAt: true },
    });

    const disallowed = users.find((user) => user.role !== targetRole);
    if (disallowed) {
      throw new ForbiddenException('Bulk actions only support accounts in the requested role scope');
    }

    const targetIds = users
      .filter((user) => (status === 'active' ? user.deletedAt !== null : user.deletedAt === null))
      .map((user) => user.id);

    if (targetIds.length === 0) {
      return {
        updatedCount: 0,
        skippedCount: uniqueIds.length,
        status,
        role: targetRole,
      };
    }

    await this.prisma.user.updateMany({
      where: { id: { in: targetIds }, role: targetRole },
      data:
        status === 'active'
          ? { deletedAt: null }
          : {
              deletedAt: new Date(),
              authTokenVersion: { increment: 1 },
              authRevokedAt: new Date(),
            },
    });

    return {
      updatedCount: targetIds.length,
      skippedCount: uniqueIds.length - targetIds.length,
      status,
      role: targetRole,
    };
  }

  /**
   * Thu hồi tất cả token hiện tại của một tài khoản quản trị.
   */
  async revokeSessions(id: number, requesterId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.id === requesterId) {
      throw new ForbiddenException('Bạn không thể thu hồi phiên của chính mình');
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Không thể thu hồi phiên của tài khoản SUPER_ADMIN');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        authTokenVersion: { increment: 1 },
        authRevokedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        authRevokedAt: true,
      },
    });

    return {
      ...updated,
      message: 'Đã thu hồi tất cả phiên đăng nhập của tài khoản này',
    };
  }

  /**
   * Thống kê KPI
   */
  async getStats(requesterRole?: Role, requestedRole?: Role) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (requestedRole) {
      const canViewRequestedRole =
        requesterRole === Role.SUPER_ADMIN ||
        (requesterRole === Role.ADMIN &&
          ADMIN_VISIBLE_USER_ROLES.includes(requestedRole)) ||
        (requesterRole === Role.STAFF && requestedRole === Role.CUSTOMER);

      if (!canViewRequestedRole) {
        throw new ForbiddenException(
          'Không có quyền xem thống kê của nhóm tài khoản này',
        );
      }

      const roleWhere: Prisma.UserWhereInput = { role: requestedRole };
      const [totalUsers, activeUsers, newThisMonth] = await Promise.all([
        this.prisma.user.count({ where: roleWhere }),
        this.prisma.user.count({
          where: { ...roleWhere, deletedAt: null },
        }),
        this.prisma.user.count({
          where: { ...roleWhere, createdAt: { gte: firstDayOfMonth } },
        }),
      ]);

      return {
        scopeRole: requestedRole,
        totalUsers,
        activeUsers,
        newThisMonth,
      };
    }

    // Chỉ thống kê CUSTOMER — đồng bộ với bảng danh sách
    const customerWhere: Prisma.UserWhereInput = { role: Role.CUSTOMER };

    if (requesterRole === Role.STAFF) {
      const [totalUsers, activeUsers, newThisMonth, customersWithBookings] = await Promise.all([
        this.prisma.user.count({ where: customerWhere }),
        this.prisma.user.count({ where: { ...customerWhere, deletedAt: null } }),
        this.prisma.user.count({
          where: { ...customerWhere, createdAt: { gte: firstDayOfMonth } },
        }),
        this.prisma.user.count({
          where: { ...customerWhere, bookings: { some: { deletedAt: null } } },
        }),
      ]);

      return {
        totalUsers,
        activeUsers,
        newThisMonth,
        customersWithBookings,
        staffAndAdmin: 0,
        staffActive: 0,
        staffNewThisMonth: 0,
        roleBreakdown: [{ role: Role.CUSTOMER, count: totalUsers }],
      };
    }

    const internalRoles =
      requesterRole === Role.SUPER_ADMIN ? [Role.ADMIN, Role.STAFF] : [Role.STAFF];
    const staffWhere = { role: { in: internalRoles } };

    const [totalUsers, activeUsers, newThisMonth, customersWithBookings, roleBreakdown, staffAndAdmin, staffActive, staffNewThisMonth] =
      await Promise.all([
        this.prisma.user.count({ where: customerWhere }),
        this.prisma.user.count({ where: { ...customerWhere, deletedAt: null } }),
        this.prisma.user.count({
          where: { ...customerWhere, createdAt: { gte: firstDayOfMonth } },
        }),
        this.prisma.user.count({
          where: { ...customerWhere, bookings: { some: { deletedAt: null } } },
        }),
        this.prisma.user.groupBy({
          by: ['role'],
          _count: { role: true },
        }),
        this.prisma.user.count({ where: staffWhere }),
        this.prisma.user.count({ where: { ...staffWhere, deletedAt: null } }),
        this.prisma.user.count({
          where: { ...staffWhere, createdAt: { gte: firstDayOfMonth } },
        }),
      ]);

    return {
      totalUsers,
      activeUsers,
      newThisMonth,
      customersWithBookings,
      staffAndAdmin,
      staffActive,
      staffNewThisMonth,
      roleBreakdown: roleBreakdown.map((r) => ({
        role: r.role,
        count: r._count.role,
      })),
    };
  }
}
