import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException('Email đã tồn tại trong hệ thống');

    // Không cho phép tạo tài khoản SUPER_ADMIN
    if (data.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Không thể tạo tài khoản SUPER_ADMIN');
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
        console.error('Failed to send email:', err);
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
    page?: number;
    limit?: number;
  }) {
    const { search, role, status, page = 1, limit = 10 } = query;

    const where: any = {};

    // Tìm kiếm theo tên hoặc email
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter theo role (hỗ trợ nhiều role cách nhau bằng dấu phẩy: role=STAFF,ADMIN)
    if (role) {
      const roles = role.split(',').filter(r => Object.values(Role).includes(r.trim() as Role)) as Role[];
      if (roles.length === 1) {
        where.role = roles[0];
      } else if (roles.length > 1) {
        where.role = { in: roles };
      }
    }

    // Filter theo status (active = deletedAt is null, deactivated = deletedAt is not null)
    if (status === 'active') {
      where.deletedAt = null;
    } else if (status === 'deactivated') {
      where.deletedAt = { not: null };
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
          _count: {
            select: {
              bookings: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        ...u,
        status: u.deletedAt ? 'Deactivated' : 'Active',
        bookingCount: u._count.bookings,
        reviewCount: u._count.reviews,
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
  async findOne(id: number) {
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
    const recentBookings = await this.prisma.booking.findMany({
      where: { userId: id },
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
    });

    return {
      ...user,
      status: user.deletedAt ? 'Deactivated' : 'Active',
      bookingCount: user._count.bookings,
      reviewCount: user._count.reviews,
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
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    return updated;
  }

  /**
   * Cập nhật thông tin cơ bản của user (từ Admin)
   */
  async updateUser(id: number, data: { fullName?: string; phone?: string; dob?: string; gender?: string; }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

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
  async toggleStatus(id: number, requesterId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Không được tự deactivate chính mình
    if (user.id === requesterId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: user.deletedAt ? null : new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        deletedAt: true,
      },
    });

    return {
      ...updated,
      status: updated.deletedAt ? 'Deactivated' : 'Active',
    };
  }

  /**
   * Thống kê KPI
   */
  async getStats() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Chỉ thống kê CUSTOMER — đồng bộ với bảng danh sách
    const customerWhere = { role: 'CUSTOMER' as any };

    const [totalUsers, activeUsers, newThisMonth, roleBreakdown] =
      await Promise.all([
        this.prisma.user.count({ where: customerWhere }),
        this.prisma.user.count({ where: { ...customerWhere, deletedAt: null } }),
        this.prisma.user.count({
          where: { ...customerWhere, createdAt: { gte: firstDayOfMonth } },
        }),
        this.prisma.user.groupBy({
          by: ['role'],
          _count: { role: true },
        }),
      ]);

    const staffAndAdmin = roleBreakdown
      .filter((r) => r.role !== 'CUSTOMER')
      .reduce((sum, r) => sum + r._count.role, 0);

    return {
      totalUsers,
      activeUsers,
      newThisMonth,
      staffAndAdmin,
      roleBreakdown: roleBreakdown.map((r) => ({
        role: r.role,
        count: r._count.role,
      })),
    };
  }
}
