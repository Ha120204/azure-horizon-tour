import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriberService {
  constructor(private prisma: PrismaService) {}

  // Public: đăng ký nhận tin
  async subscribe(email: string) {
    const existing = await this.prisma.subscriber.findUnique({ where: { email } });
    if (existing) {
      return { success: true, message: 'already_exists', data: existing };
    }
    const newSubscriber = await this.prisma.subscriber.create({ data: { email } });
    return { success: true, message: 'created', data: newSubscriber };
  }

  // Admin/Staff: danh sách subscribers có phân trang
  async getAll(query: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;
    const where = search
      ? { email: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [subscribers, total] = await Promise.all([
      this.prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.subscriber.count({ where }),
    ]);

    return {
      data: subscribers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Admin/Staff: thống kê subscriber
  async getStats() {
    const [total, active, thisMonth] = await Promise.all([
      this.prisma.subscriber.count(),
      this.prisma.subscriber.count({ where: { isActive: true } }),
      this.prisma.subscriber.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);
    return { total, active, inactive: total - active, thisMonth };
  }

  // Admin: xóa subscriber
  async remove(id: number) {
    return this.prisma.subscriber.delete({ where: { id } });
  }
}
