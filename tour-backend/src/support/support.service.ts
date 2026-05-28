import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';

type TicketStatus   = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
type TicketCategory = 'booking' | 'payment' | 'reschedule' | 'complaint' | 'general';
type BookingMatchStatus = 'NO_REFERENCE' | 'MATCHED' | 'NOT_FOUND';

type BookingSummary = {
  id: number;
  bookingCode: string;
  tourId: number;
  tourName: string;
  tourStartDate: Date;
  tourDuration: string;
  departureId: number | null;
  departureDate: Date | null;
  status: string;
  paymentStatus: string;
  numberOfPeople: number;
  totalPrice: number;
  createdAt: Date;
};

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private readonly adminNotifications: AdminNotificationService,
  ) {}

  private normalizeBookingRef(bookingRef?: string | null) {
    const trimmed = bookingRef?.trim();
    return trimmed ? trimmed : null;
  }

  private async attachBookingSummaries<T extends { bookingRef: string | null }>(
    tickets: T[],
  ): Promise<Array<T & { linkedBooking: BookingSummary | null; bookingMatchStatus: BookingMatchStatus }>> {
    const refs = Array.from(
      new Set(
        tickets
          .map((ticket) => this.normalizeBookingRef(ticket.bookingRef))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (refs.length === 0) {
      return tickets.map((ticket) => ({
        ...ticket,
        linkedBooking: null,
        bookingMatchStatus: 'NO_REFERENCE',
      }));
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        OR: refs.map((ref) => ({
          bookingCode: { equals: ref, mode: 'insensitive' },
        })),
      },
      select: {
        id: true,
        bookingCode: true,
        tourId: true,
        departureId: true,
        status: true,
        paymentStatus: true,
        numberOfPeople: true,
        totalPrice: true,
        createdAt: true,
        tour: {
          select: {
            name: true,
            startDate: true,
            duration: true,
          },
        },
      },
    });

    const departureIds = bookings
      .map((booking) => booking.departureId)
      .filter((value): value is number => typeof value === 'number');
    const departures = departureIds.length > 0
      ? await this.prisma.tourDeparture.findMany({
          where: { id: { in: departureIds } },
          select: { id: true, departureDate: true },
        })
      : [];
    const departureMap = new Map(
      departures.map((departure) => [departure.id, departure.departureDate]),
    );
    const bookingMap = new Map(
      bookings.map((booking) => [
        booking.bookingCode.toUpperCase(),
        {
          id: booking.id,
          bookingCode: booking.bookingCode,
          tourId: booking.tourId,
          tourName: booking.tour.name,
          tourStartDate: booking.tour.startDate,
          tourDuration: booking.tour.duration,
          departureId: booking.departureId,
          departureDate: booking.departureId
            ? departureMap.get(booking.departureId) ?? null
            : null,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          numberOfPeople: booking.numberOfPeople,
          totalPrice: booking.totalPrice,
          createdAt: booking.createdAt,
        } satisfies BookingSummary,
      ]),
    );

    return tickets.map((ticket) => {
      const ref = this.normalizeBookingRef(ticket.bookingRef);
      const linkedBooking = ref ? bookingMap.get(ref.toUpperCase()) ?? null : null;
      return {
        ...ticket,
        linkedBooking,
        bookingMatchStatus: ref ? (linkedBooking ? 'MATCHED' : 'NOT_FOUND') : 'NO_REFERENCE',
      };
    });
  }

  // ─── [ADMIN/STAFF] Danh sách tickets với filter + phân trang ────────────────
  async getStats() {
    const overdueSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [statusRows, total, overdue, firstStaffReplies] = await Promise.all([
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({
        where: {
          status: { in: ['NEW', 'IN_PROGRESS'] },
          createdAt: { lt: overdueSince },
        },
      }),
      this.prisma.supportTicket.findMany({
        where: { replies: { some: { senderType: 'staff' } } },
        select: {
          createdAt: true,
          replies: {
            where: { senderType: 'staff' },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
    ]);

    const map: Record<string, number> = {};
    for (const row of statusRows) map[row.status] = row._count.status;

    const responseTimes = firstStaffReplies
      .map((ticket) =>
        ticket.replies[0]?.createdAt
          ? ticket.replies[0].createdAt.getTime() - ticket.createdAt.getTime()
          : null,
      )
      .filter((value): value is number => typeof value === 'number' && value >= 0);
    const avgFirstResponseMinutes = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length / 60000)
      : null;

    const newCount = map.NEW || 0;
    const inProgress = map.IN_PROGRESS || 0;
    const resolved = map.RESOLVED || 0;

    return {
      total,
      new: newCount,
      inProgress,
      resolved,
      open: newCount + inProgress,
      overdue,
      avgFirstResponseMinutes,
    };
  }

  async getTickets(query: {
    status?:   string;
    category?: string;
    search?:   string;
    view?:     string;
    page?:     number;
    limit?:    number;
  }) {
    const page  = Math.max(1, query.page  ?? 1);
    const limit = Math.min(50, query.limit ?? 20);
    const skip  = (page - 1) * limit;
    const overdueSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const where: Prisma.SupportTicketWhereInput = {};
    if (query.view === 'open') {
      where.status = { in: ['NEW', 'IN_PROGRESS'] };
    } else if (query.view === 'overdue') {
      where.status = { in: ['NEW', 'IN_PROGRESS'] };
      where.createdAt = { lt: overdueSince };
    }
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
        { bookingRef:     { contains: query.search, mode: 'insensitive' } },
        { subject:       { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    const kpiData = await this.prisma.supportTicket.groupBy({
      by: ['status'],
      _count: true,
    });

    let newCount = 0, inProgressCount = 0, resolvedCount = 0;
    for (const group of kpiData) {
      if (group.status === 'NEW') newCount = group._count;
      if (group.status === 'IN_PROGRESS') inProgressCount = group._count;
      if (group.status === 'RESOLVED') resolvedCount = group._count;
    }
    const ticketsWithBooking = await this.attachBookingSummaries(tickets);

    return {
      tickets: ticketsWithBooking,
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
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });

    if (!ticket) return null;
    const [ticketWithBooking] = await this.attachBookingSummaries([ticket]);
    return ticketWithBooking;
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
  async replyTicket(id: number, content: string, staffName: string, staffId: number) {
    const reply = await this.prisma.ticketReply.create({
      data: {
        ticketId:   id,
        senderType: 'staff',
        senderName: staffName,
        content,
      },
    });
    // Tự chuyển sang IN_PROGRESS và assign staff nếu vẫn NEW
    await this.prisma.supportTicket.update({
      where: { id },
      data:  { status: 'IN_PROGRESS', assignedStaffId: staffId },
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
    const ticket = await this.prisma.supportTicket.create({
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

    await this.adminNotifications.createSafe({
      type: 'support_new',
      resourceType: 'SupportTicket',
      resourceId: ticket.id,
      title: 'Ticket hỗ trợ mới',
      body: `${ticket.customerName} gửi yêu cầu: ${ticket.subject}.`,
      href: '/admin/support?status=NEW',
      severity: 'urgent',
      targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
      metadata: {
        ticketId: ticket.id,
        category: ticket.category,
        bookingRef: ticket.bookingRef,
      },
    });

    return ticket;
  }

  // ─── [CUSTOMER] Lấy danh sách ticket của mình ────────────────────────────────────────────
  async getMyTickets(identifier: { userId?: number }) {
    // Chỉ cho phép user đã đăng nhập xem danh sách ticket để chống lộ dữ liệu
    if (!identifier.userId) {
      throw new ForbiddenException('Bạn cần đăng nhập để xem danh sách yêu cầu hỗ trợ.');
    }

    return this.prisma.supportTicket.findMany({
      where: { userId: identifier.userId },
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
  async getTicketDetailForCustomer(id: number, identifier: { accessCode?: string; userId?: number }) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });

    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    // Verify: User đăng nhập kiểm tra userId. Khách vãng lai bắt buộc phải có accessCode khớp
    const isOwner = identifier.userId
      ? ticket.userId === identifier.userId
      : (identifier.accessCode && ticket.accessCode === identifier.accessCode);

    if (!isOwner) throw new ForbiddenException('Bạn không có quyền xem ticket này');

    return ticket;
  }

  // ─── [CUSTOMER] Phản hồi lại staff (chỉ khi IN_PROGRESS) ───────────────────
  async customerReply(id: number, content: string, identifier: { accessCode?: string; userId?: number; name: string }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    // Verify quyền sở hữu
    const isOwner = identifier.userId
      ? ticket.userId === identifier.userId
      : (identifier.accessCode && ticket.accessCode === identifier.accessCode);
    if (!isOwner) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');

    // Chỉ cho reply khi đang IN_PROGRESS
    if (ticket.status !== 'IN_PROGRESS') {
      throw new ForbiddenException(
        ticket.status === 'NEW'
          ? 'Yêu cầu chưa được nhân viên phản hồi, vui lòng chờ.'
          : 'Yêu cầu đã được giải quyết. Nếu vẫn cần hỗ trợ, hãy mở lại yêu cầu.',
      );
    }

    const reply = await this.prisma.ticketReply.create({
      data: {
        ticketId:   id,
        senderType: 'customer',
        senderName: identifier.name,
        content,
      },
    });

    await this.adminNotifications.createSafe({
      type: 'support_in_progress',
      resourceType: 'SupportTicket',
      resourceId: ticket.id,
      title: 'Khách hàng phản hồi ticket',
      body: `${identifier.name} vừa bổ sung thông tin cho ticket #${ticket.id}.`,
      href: '/admin/support?status=IN_PROGRESS',
      severity: 'warning',
      targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
      metadata: {
        ticketId: ticket.id,
        category: ticket.category,
        bookingRef: ticket.bookingRef,
      },
    });

    return reply;
  }

  // ─── [CUSTOMER] Đánh giá sau khi RESOLVED ───────────────────────────────────
  async rateTicket(id: number, rating: number, identifier: { accessCode?: string; userId?: number }) {
    if (rating < 1 || rating > 5) throw new ForbiddenException('Đánh giá phải từ 1 đến 5 sao');

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const isOwner = identifier.userId
      ? ticket.userId === identifier.userId
      : (identifier.accessCode && ticket.accessCode === identifier.accessCode);
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
  async reopenTicket(id: number, identifier: { accessCode?: string; userId?: number }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const isOwner = identifier.userId
      ? ticket.userId === identifier.userId
      : (identifier.accessCode && ticket.accessCode === identifier.accessCode);
    if (!isOwner) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');

    if (ticket.status !== 'RESOLVED') {
      throw new ForbiddenException('Chỉ có thể mở lại yêu cầu đã được giải quyết');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data:  { status: 'NEW', rating: null },
    });

    await this.adminNotifications.createSafe({
      type: 'support_new',
      resourceType: 'SupportTicket',
      resourceId: updated.id,
      title: 'Ticket đã được mở lại',
      body: `${updated.customerName} mở lại ticket #${updated.id}.`,
      href: '/admin/support?status=NEW',
      severity: 'urgent',
      targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
      metadata: {
        ticketId: updated.id,
        category: updated.category,
        bookingRef: updated.bookingRef,
      },
    });

    return updated;
  }
}
