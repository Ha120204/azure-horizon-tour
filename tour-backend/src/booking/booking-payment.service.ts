import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { MailService } from '../mail/mail.service';
import { AssistedDraftService } from './assisted-draft.service';
import type { TransactionClient } from './types';
import { getErrorMessage } from './helpers/booking-helpers';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';
import type {
  ConfirmInStoreDto,
  ReconcilePayosDto,
  ReportPaymentIssueDto,
} from './dto/payment-booking.dto';

// ─── Constants ────────────────────────────────────────────────────────────────

export type InStoreCollectionMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD_POS';

const IN_STORE_SOURCE_MAP: Record<InStoreCollectionMethod, string> = {
  CASH: 'IN_STORE_CASH',
  BANK_TRANSFER: 'IN_STORE_BANK_TRANSFER',
  CARD_POS: 'IN_STORE_CARD_POS',
};

// ─── Re-export DTO types for controller imports ────────────────────────────────
export type { ConfirmInStoreDto, ReconcilePayosDto, ReportPaymentIssueDto };

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BookingPaymentService {
  private readonly logger = new Logger(BookingPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly mailService: MailService,
    private readonly assistedDraftService: AssistedDraftService,
    private readonly adminNotifications: AdminNotificationService,
  ) {}

  // ─── Shared helpers ───────────────────────────────────────────────────────

  private async findBookingForPayment(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        tour: { select: { id: true, name: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.status === 'CONFIRMED')
      throw new BadRequestException('Đơn hàng đã được xác nhận trước đó');
    if (booking.status === 'CANCELLED')
      throw new BadRequestException('Không thể xác nhận đơn hàng đã hủy');
    return booking;
  }

  private async confirmBookingAsPaid(
    bookingId: number,
    confirmedSource: string,
    confirmedById: number,
    transactionData: {
      gateway: string;
      transactionRef?: string;
      amount: number;
      confirmedNote?: string;
      evidenceUrl?: string;
    },
  ) {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật booking
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          confirmedById,
        },
      });

      // 2. Ghi PaymentTransaction với đầy đủ audit trail
      const pendingTransaction = await tx.paymentTransaction.findFirst({
        where: {
          bookingId,
          gateway: transactionData.gateway,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      await tx.paymentTransaction.updateMany({
        where: {
          bookingId,
          status: 'PENDING',
          ...(pendingTransaction ? { id: { not: pendingTransaction.id } } : {}),
        },
        data: {
          status: 'FAILED',
          confirmedNote: 'Superseded by a successful payment confirmation',
        },
      });

      const successTransactionData = {
        gateway: transactionData.gateway,
        transactionRef: transactionData.transactionRef ?? null,
        amount: Math.round(transactionData.amount),
        status: 'SUCCESS',
        confirmedSource,
        confirmedById,
        confirmedAt: now,
        confirmedNote: transactionData.confirmedNote ?? null,
        evidenceUrl: transactionData.evidenceUrl ?? null,
      };

      if (pendingTransaction) {
        await tx.paymentTransaction.update({
          where: { id: pendingTransaction.id },
          data: successTransactionData,
        });
      } else {
        await tx.paymentTransaction.create({
          data: {
            bookingId,
            ...successTransactionData,
          },
        });
      }

      // 3. Mark voucher đã dùng — chỉ với assisted booking (regular booking đã claim lúc create())
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { userId: true, voucherCode: true, isAssistedBooking: true },
      });
      if (booking?.voucherCode && booking.isAssistedBooking) {
        await this.assistedDraftService.markVoucherAsUsed(
          tx as TransactionClient,
          booking.userId,
          booking.voucherCode,
        );
      }
    });
  }

  private async sendConfirmationEmail(bookingId: number) {
    try {
      const fullBooking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: true, tour: true, assistedDraft: true },
      });
      const ticketEmail =
        fullBooking?.assistedDraft?.emailForTicket || fullBooking?.user?.email;
      if (fullBooking && ticketEmail) {
        await this.mailService.sendBookingConfirmation({
          to: ticketEmail,
          customerName: fullBooking.user.fullName,
          bookingCode: fullBooking.bookingCode,
          tourName: fullBooking.tour.name,
          startDate: fullBooking.tour.startDate.toLocaleDateString('vi-VN'),
          duration: fullBooking.tour.duration,
          numberOfPeople: fullBooking.numberOfPeople,
          totalPrice: `${fullBooking.totalPrice.toLocaleString('vi-VN')}₫`,
          discountAmount:
            fullBooking.discountAmount > 0
              ? `${fullBooking.discountAmount.toLocaleString('vi-VN')}₫`
              : undefined,
        });
      }
    } catch (emailError) {
      this.logger.error('[EMAIL] Failed to send confirmation email:', getErrorMessage(emailError));
      // Không throw — email lỗi không được làm hỏng luồng xác nhận
    }
  }

  // ─── Luồng IN_STORE ───────────────────────────────────────────────────────

  /**
   * [STAFF + ADMIN] Ghi nhận thu tiền tại cửa hàng.
   * Phân biệt rõ cách thu: CASH / BANK_TRANSFER / CARD_POS.
   */
  async confirmInStore(
    bookingId: number,
    dto: ConfirmInStoreDto,
    actorId: number,
  ) {
    const booking = await this.findBookingForPayment(bookingId);

    if (booking.paymentMethod !== 'IN_STORE') {
      throw new BadRequestException(
        'Đơn này không phải thanh toán tại cửa hàng. ' +
          'Dùng chức năng đối soát PayOS nếu là chuyển khoản.',
      );
    }

    const confirmedSource = IN_STORE_SOURCE_MAP[dto.collectionMethod];
    const amount = dto.amount ?? Number(booking.totalPrice);

    await this.confirmBookingAsPaid(bookingId, confirmedSource, actorId, {
      gateway: 'MANUAL',
      transactionRef: dto.receiptRef,
      amount,
      confirmedNote: dto.note,
    });

    this.logger.log(
      `[IN_STORE] Payment collected for bookingId=${bookingId} method=${dto.collectionMethod} actorId=${actorId ?? 'system'}`,
    );

    await this.sendConfirmationEmail(bookingId);

    return { message: 'Đã ghi nhận thu tiền tại cửa hàng thành công' };
  }

  // ─── Luồng PayOS — Sync ───────────────────────────────────────────────────

  /**
   * [CUSTOMER] Hỏi PayOS xem đã thanh toán chưa — dùng cho inline QR modal.
   * Chỉ hoạt động khi booking thuộc về userId và đang PENDING+UNPAID.
   */
  async customerCheckPayment(bookingId: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('Không có quyền truy cập đơn này');
    if (booking.paymentStatus === 'PAID') return { synced: true, status: 'PAID' };
    if (booking.paymentMethod !== 'PAYOS' || booking.status !== 'PENDING')
      return { synced: false, status: booking.paymentStatus };

    const latestTx = await this.prisma.paymentTransaction.findFirst({
      where: { bookingId, gateway: 'PAYOS' },
      orderBy: { createdAt: 'desc' },
    });
    const orderCode = latestTx?.transactionRef ? Number(latestTx.transactionRef) : Number.NaN;
    if (!Number.isFinite(orderCode)) return { synced: false, status: 'NO_ORDER_CODE' };

    let paymentInfo: Awaited<ReturnType<typeof this.paymentService.getPaymentInfo>>;
    try {
      paymentInfo = await this.paymentService.getPaymentInfo(orderCode);
    } catch {
      return { synced: false, status: 'PAYOS_ERROR' };
    }

    if (paymentInfo?.status === 'PAID') {
      const txnRef = paymentInfo.transactions?.[0]?.reference || `PAYOS-QR-SYNC-${orderCode}`;
      await this.confirmBookingAsPaid(bookingId, 'PAYOS_RETURN_SYNC', userId, {
        gateway: 'PAYOS',
        transactionRef: txnRef,
        amount: paymentInfo.amount || Number(booking.totalPrice),
        confirmedNote: `QR inline sync · User #${userId}`,
        evidenceUrl: undefined,
      });
      await this.sendConfirmationEmail(bookingId);
      return { synced: true, status: 'PAID' };
    }

    return { synced: false, status: paymentInfo?.status ?? 'UNKNOWN' };
  }

  /**
   * [ADMIN] Gọi lại PayOS API để đồng bộ trạng thái thực tế.
   * Dùng khi webhook chưa về hoặc cần xác nhận thủ công.
   */
  async syncPayosStatus(bookingId: number, actorId: number) {
    const booking = await this.findBookingForPayment(bookingId);

    if (booking.paymentMethod !== 'PAYOS') {
      throw new BadRequestException(
        'Đơn này không dùng PayOS. Dùng chức năng ghi nhận tại cửa hàng.',
      );
    }

    // Tìm PaymentTransaction gần nhất để lấy orderCode
    const latestTx = await this.prisma.paymentTransaction.findFirst({
      where: { bookingId, gateway: 'PAYOS' },
      orderBy: { createdAt: 'desc' },
    });

    const orderCode = latestTx?.transactionRef
      ? Number(latestTx.transactionRef)
      : Number.NaN;
    if (!Number.isFinite(orderCode)) {
      throw new BadRequestException(
        'Đơn này chưa lưu mã PayOS orderCode. Vui lòng tạo lại liên kết thanh toán hoặc dùng đối soát thủ công.',
      );
    }

    let paymentInfo: Awaited<ReturnType<typeof this.paymentService.getPaymentInfo>>;
    try {
      paymentInfo = await this.paymentService.getPaymentInfo(orderCode);
    } catch (error) {
      this.logger.error(
        `[PAYOS_SYNC] Unable to fetch PayOS status for bookingId=${bookingId}: ${getErrorMessage(error)}`,
      );
      throw new BadRequestException(
        'Không thể kết nối PayOS. Vui lòng thử lại sau.',
      );
    }

    this.logger.log(
      `[PAYOS_SYNC] Booking #${bookingId} · PayOS status: ${paymentInfo?.status} · Actor #${actorId}`,
    );

    if (paymentInfo?.status === 'PAID') {
      const txnRef =
        paymentInfo.transactions?.[0]?.reference || `PAYOS-SYNC-${orderCode}`;

      await this.confirmBookingAsPaid(
        bookingId,
        'PAYOS_RETURN_SYNC',
        actorId,
        {
          gateway: 'PAYOS',
          transactionRef: txnRef,
          amount: paymentInfo.amount || Number(booking.totalPrice),
          confirmedNote: `Admin sync thủ công · Actor #${actorId}`,
          evidenceUrl: undefined,
        },
      );

      await this.sendConfirmationEmail(bookingId);
      return { synced: true, status: 'PAID', message: 'PayOS đã xác nhận thanh toán. Đơn đã được xác nhận.' };
    }

    return {
      synced: false,
      status: paymentInfo?.status ?? 'UNKNOWN',
      message: `PayOS trả về trạng thái: ${paymentInfo?.status ?? 'UNKNOWN'}. Đơn chưa được xác nhận.`,
    };
  }

  // ─── Luồng PayOS — Manual Reconciliation ─────────────────────────────────

  /**
   * [ADMIN] Xác nhận đối soát thủ công khi khách gửi ảnh CK.
   * Bắt buộc nhập mã giao dịch + ghi chú. Ghi rõ evidenceUrl.
   */
  async reconcilePayosManual(
    bookingId: number,
    dto: ReconcilePayosDto,
    actorId: number,
  ) {
    if (!dto.transactionRef?.trim()) {
      throw new BadRequestException(
        'Mã tham chiếu giao dịch là bắt buộc khi đối soát thủ công.',
      );
    }
    if (!dto.note?.trim() || dto.note.trim().length < 5) {
      throw new BadRequestException(
        'Ghi chú xác nhận là bắt buộc (tối thiểu 5 ký tự).',
      );
    }

    const booking = await this.findBookingForPayment(bookingId);

    if (booking.paymentMethod !== 'PAYOS') {
      throw new BadRequestException(
        'Đơn này không dùng PayOS. Dùng chức năng ghi nhận tại cửa hàng.',
      );
    }

    await this.confirmBookingAsPaid(
      bookingId,
      'PAYOS_MANUAL_RECONCILIATION',
      actorId,
      {
        gateway: 'PAYOS',
        transactionRef: dto.transactionRef.trim(),
        amount: dto.amount,
        confirmedNote: dto.note.trim(),
        evidenceUrl: dto.evidenceUrl,
      },
    );

    // Đóng ticket hỗ trợ liên quan nếu có
    const openTicket = await this.prisma.supportTicket.findFirst({
      where: {
        bookingId,
        category: 'payment',
        status: { in: ['NEW', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (openTicket) {
      await this.prisma.supportTicket.update({
        where: { id: openTicket.id },
        data: { status: 'RESOLVED' },
      });
      this.logger.log(
        `[PAYOS_RECONCILE] Đã tự động đóng ticket #${openTicket.id} sau khi xác nhận đối soát`,
      );
    }

    this.logger.log(
      `[PAYOS_RECONCILE] Payment reconciled for bookingId=${bookingId} actorId=${actorId}`,
    );

    await this.sendConfirmationEmail(bookingId);

    return { message: 'Đã xác nhận đối soát thành công. Đơn đã được xác nhận.' };
  }

  // ─── Khách báo sự cố thanh toán ───────────────────────────────────────────

  /**
   * [CUSTOMER] Khách báo sự cố khi đã chuyển khoản nhưng hệ thống chưa ghi nhận.
   * Tạo SupportTicket với bookingId FK, đổi paymentStatus → PROCESSING.
   */
  async reportPaymentIssue(
    bookingId: number,
    userId: number,
    dto: ReportPaymentIssueDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }
    if (booking.paymentMethod !== 'PAYOS') {
      throw new BadRequestException(
        'Tính năng này chỉ dành cho đơn thanh toán chuyển khoản PayOS.',
      );
    }
    if (booking.status === 'CONFIRMED') {
      throw new BadRequestException('Đơn đã được xác nhận, không cần báo sự cố.');
    }
    if (booking.paymentStatus === 'PAID') {
      throw new BadRequestException('Đơn đã được ghi nhận thanh toán.');
    }

    // Kiểm tra xem đã có ticket payment open chưa (tránh tạo trùng)
    const existingTicket = await this.prisma.supportTicket.findFirst({
      where: {
        bookingId,
        category: 'payment',
        status: { in: ['NEW', 'IN_PROGRESS'] },
      },
    });

    if (existingTicket) {
      return {
        message: 'Yêu cầu hỗ trợ của bạn đang được xử lý.',
        ticketId: existingTicket.id,
        accessCode: existingTicket.accessCode,
      };
    }

    const amountText =
      typeof dto.amount === 'number' && Number.isFinite(dto.amount)
        ? `${Math.round(dto.amount).toLocaleString('vi-VN')}đ`
        : null;
    const transferredAt = dto.transferredAt
      ? new Date(dto.transferredAt)
      : null;
    const transferredAtText =
      transferredAt && !Number.isNaN(transferredAt.getTime())
        ? transferredAt.toLocaleString('vi-VN')
        : null;
    const issueDetails = [
      'Khách báo đã chuyển khoản nhưng hệ thống chưa ghi nhận.',
      amountText ? `Số tiền khách báo đã chuyển: ${amountText}` : null,
      transferredAtText ? `Thời gian chuyển khoản: ${transferredAtText}` : null,
      dto.transactionRef?.trim()
        ? `Mã giao dịch/nội dung chuyển khoản: ${dto.transactionRef.trim()}`
        : null,
      dto.senderBank?.trim() ? `Ngân hàng chuyển: ${dto.senderBank.trim()}` : null,
      dto.senderAccountName?.trim()
        ? `Tên chủ tài khoản chuyển: ${dto.senderAccountName.trim()}`
        : null,
      dto.message?.trim() ? `Ghi chú của khách: ${dto.message.trim()}` : null,
      dto.evidenceUrl?.trim() ? `Biên lai/ảnh xác nhận: ${dto.evidenceUrl.trim()}` : null,
    ].filter(Boolean).join('\n');

    const [ticket] = await this.prisma.$transaction([
      // Tạo support ticket gắn FK thật
      this.prisma.supportTicket.create({
        data: {
          customerName: booking.user.fullName,
          customerEmail: booking.user.email,
          bookingRef: booking.bookingCode,
          bookingId: booking.id,
          userId,
          subject: `Kiểm tra thanh toán - Đơn ${booking.bookingCode}`,
          message: issueDetails,
          category: 'payment',
          status: 'NEW',
        },
      }),
      // Chuyển paymentStatus → PROCESSING để admin biết đang chờ xử lý
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: 'PROCESSING' },
      }),
    ]);

    this.logger.log(
      `[PAYMENT_ISSUE] Ticket #${ticket.id} created for bookingId=${bookingId} userId=${userId}`,
    );

    await this.adminNotifications.createSafe({
      type: 'support_new',
      resourceType: 'SupportTicket',
      resourceId: ticket.id,
      title: 'Khách báo sự cố thanh toán',
      body: `${booking.user.fullName} báo cần đối soát booking ${booking.bookingCode}.`,
      href: '/admin/bookings?needsReconciliation=true',
      severity: 'urgent',
      targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
      metadata: {
        bookingId,
        bookingCode: booking.bookingCode,
        ticketId: ticket.id,
        category: 'payment',
      },
    });

    return {
      message:
        'Đã nhận yêu cầu kiểm tra thanh toán. Chúng tôi sẽ đối soát và phản hồi trong thời gian sớm nhất.',
      ticketId: ticket.id,
      accessCode: ticket.accessCode,
    };
  }

  // ─── Phase 3: Payment Stats ───────────────────────────────────────────────

  /**
   * Thống kê doanh thu theo nguồn thanh toán (confirmedSource)
   * Dùng cho widget dashboard admin — phân tích nguồn tiền vào thực tế.
   */
  async getPaymentStats(dateFrom?: string, dateTo?: string) {
    const where: {
      status: string;
      confirmedAt?: { gte?: Date; lte?: Date };
    } = { status: 'SUCCESS' };

    if (dateFrom || dateTo) {
      where.confirmedAt = {};
      if (dateFrom) where.confirmedAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.confirmedAt.lte = end;
      }
    }

    const [transactions, totalResult] = await Promise.all([
      this.prisma.paymentTransaction.groupBy({
        by: ['confirmedSource'],
        where,
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.paymentTransaction.aggregate({
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalRevenue = Number(totalResult._sum.amount ?? 0);
    const totalCount = totalResult._count.id;

    const breakdown = transactions.map((row) => {
      const revenue = Number(row._sum.amount ?? 0);
      return {
        source: row.confirmedSource ?? 'UNKNOWN',
        revenue,
        count: row._count.id,
        percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
      };
    });

    // Tổng hợp theo nhóm (IN_STORE vs PAYOS)
    const inStoreRevenue = breakdown
      .filter(r => r.source.startsWith('IN_STORE'))
      .reduce((sum, r) => sum + r.revenue, 0);
    const payosRevenue = breakdown
      .filter(r => r.source.startsWith('PAYOS'))
      .reduce((sum, r) => sum + r.revenue, 0);
    const overrideRevenue = breakdown
      .filter(r => r.source === 'ADMIN_OVERRIDE' || r.source === 'UNKNOWN')
      .reduce((sum, r) => sum + r.revenue, 0);

    return {
      totalRevenue,
      totalCount,
      breakdown,
      byGroup: {
        IN_STORE: { revenue: inStoreRevenue, percentage: totalRevenue > 0 ? Math.round((inStoreRevenue / totalRevenue) * 1000) / 10 : 0 },
        PAYOS:    { revenue: payosRevenue,   percentage: totalRevenue > 0 ? Math.round((payosRevenue   / totalRevenue) * 1000) / 10 : 0 },
        OTHER:    { revenue: overrideRevenue, percentage: totalRevenue > 0 ? Math.round((overrideRevenue / totalRevenue) * 1000) / 10 : 0 },
      },
    };
  }
}
