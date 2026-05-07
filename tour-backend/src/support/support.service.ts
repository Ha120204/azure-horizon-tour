import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type TicketStatus   = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
type TicketCategory = 'booking' | 'payment' | 'reschedule' | 'complaint' | 'general';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  // ─── [ADMIN/STAFF] Danh sách tickets với filter + phân trang ────────────────
  async getTickets(query: {
    status?:   string;
    category?: string;
    search?:   string;
    page?:     number;
    limit?:    number;
  }) {
    const page  = Math.max(1, query.page  ?? 1);
    const limit = Math.min(50, query.limit ?? 20);
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as TicketStatus;
    }
    if (query.category && query.category !== 'ALL') {
      where.category = query.category as TicketCategory;
    }
    if (query.search) {
      where.OR = [
        { customerName:  { contains: query.search, mode: 'insensitive' } },
        { customerEmail: { contains: query.search, mode: 'insensitive' } },
        { subject:       { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          replies: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    const [newCount, inProgressCount, resolvedCount] = await Promise.all([
      this.prisma.supportTicket.count({ where: { status: 'NEW' } }),
      this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
    ]);

    return {
      tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      kpi: {
        new:        newCount,
        inProgress: inProgressCount,
        resolved:   resolvedCount,
      },
    };
  }

  // ─── [ADMIN/STAFF] Chi tiết một ticket ──────────────────────────────────────
  async getTicketById(id: number) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });
  }

  // ─── [ADMIN/STAFF] Assign staff vào ticket ───────────────────────────────────
  async assignTicket(id: number, staffId: number) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { assignedStaffId: staffId, status: 'IN_PROGRESS' },
    });
  }

  // ─── [ADMIN/STAFF] Cập nhật trạng thái ──────────────────────────────────────
  async updateStatus(id: number, status: TicketStatus) {
    return this.prisma.supportTicket.update({
      where: { id },
      data:  { status },
    });
  }

  // ─── [ADMIN/STAFF] Staff phản hồi ticket ────────────────────────────────────
  async replyTicket(id: number, content: string, staffName: string) {
    const reply = await this.prisma.ticketReply.create({
      data: {
        ticketId:   id,
        senderType: 'staff',
        senderName: staffName,
        content,
      },
    });
    // Tự chuyển sang IN_PROGRESS nếu vẫn NEW
    await this.prisma.supportTicket.update({
      where: { id },
      data:  { status: 'IN_PROGRESS' },
    });
    return reply;
  }

  // ─── [PUBLIC] Tạo ticket từ form Contact ────────────────────────────────────
  async createFromContact(data: {
    customerName:  string;
    customerEmail: string;
    customerPhone: string;
    bookingRef?:   string;
    subject:       string;
    message:       string;
    category:      TicketCategory;
    userId?:       number;  // Optional — chỉ có khi user đã đăng nhập
  }) {
    return this.prisma.supportTicket.create({
      data: {
        customerName:  data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        bookingRef:    data.bookingRef,
        subject:       data.subject,
        message:       data.message,
        category:      data.category,
        status:        'NEW',
        userId:        data.userId ?? null,
      },
    });
  }

  // ─── [CUSTOMER] Lấy danh sách ticket của mình ────────────────────────────────────────────
  async getMyTickets(identifier: { email: string; userId?: number }) {
    // Tìm theo userId (nếu đăng nhập) hoặc email — dùng OR để bao gồm cả ticket cũ
    // được tạo khi chưa đăng nhập (userId = null) nhưng cùng email
    const orConditions: any[] = [];
    if (identifier.userId) {
      orConditions.push({ userId: identifier.userId });
    }
    if (identifier.email) {
      orConditions.push({ customerEmail: { equals: identifier.email, mode: 'insensitive' } });
    }

    const where = orConditions.length > 0 ? { OR: orConditions } : {};

    return this.prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        replies: {
          orderBy: { createdAt: 'desc' },
          take: 1,  // Chỉ lấy reply mới nhất để hiện preview
        },
      },
    });
  }

  // ─── [CUSTOMER] Xem chi tiết 1 ticket (verify quyền truy cập) ───────────────
  async getTicketDetailForCustomer(id: number, identifier: { email: string; userId?: number }) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });

    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    // Verify: phải là chủ ticket mới xem được
    const isOwner = identifier.userId
      ? ticket.userId === identifier.userId
      : ticket.customerEmail.toLowerCase() === identifier.email.toLowerCase();

    if (!isOwner) throw new ForbiddenException('Bạn không có quyền xem ticket này');

    return ticket;
  }

  // ─── [CUSTOMER] Phản hồi lại staff (chỉ khi IN_PROGRESS) ───────────────────
  async customerReply(id: number, content: string, identifier: { email: string; userId?: number; name: string }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    // Verify quyền sở hữu
    const isOwner = identifier.userId
      ? ticket.userId === identifier.userId
      : ticket.customerEmail.toLowerCase() === identifier.email.toLowerCase();
    if (!isOwner) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');

    // Chỉ cho reply khi đang IN_PROGRESS
    if (ticket.status !== 'IN_PROGRESS') {
      throw new ForbiddenException(
        ticket.status === 'NEW'
          ? 'Yêu cầu chưa được nhân viên phản hồi, vui lòng chờ.'
          : 'Yêu cầu đã được giải quyết. Nếu vẫn cần hỗ trợ, hãy mở lại yêu cầu.',
      );
    }

    return this.prisma.ticketReply.create({
      data: {
        ticketId:   id,
        senderType: 'customer',
        senderName: identifier.name,
        content,
      },
    });
  }

  // ─── [CUSTOMER] Đánh giá sau khi RESOLVED ───────────────────────────────────
  async rateTicket(id: number, rating: number, identifier: { email: string; userId?: number }) {
    if (rating < 1 || rating > 5) throw new ForbiddenException('Đánh giá phải từ 1 đến 5 sao');

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const isOwner = identifier.userId
      ? ticket.userId === identifier.userId
      : ticket.customerEmail.toLowerCase() === identifier.email.toLowerCase();
    if (!isOwner) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');

    if (ticket.status !== 'RESOLVED') {
      throw new ForbiddenException('Chỉ có thể đánh giá khi yêu cầu đã được giải quyết');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data:  { rating },
    });
  }

  // ─── [CUSTOMER] Mở lại ticket đã RESOLVED ───────────────────────────────────
  async reopenTicket(id: number, identifier: { email: string; userId?: number }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const isOwner = identifier.userId
      ? ticket.userId === identifier.userId
      : ticket.customerEmail.toLowerCase() === identifier.email.toLowerCase();
    if (!isOwner) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');

    if (ticket.status !== 'RESOLVED') {
      throw new ForbiddenException('Chỉ có thể mở lại yêu cầu đã được giải quyết');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data:  { status: 'NEW', rating: null },
    });
  }
}
