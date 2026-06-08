import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

export class AssignBookingTransportDto {
  outboundTicketCodes?: string[];
  outboundSeatNumbers?: string[];
  outboundPnrCode?: string;
  returnTicketCodes?: string[];
  returnSeatNumbers?: string[];
  returnPnrCode?: string;
  vehiclePlate?: string;
  seatNumbers?: string[];
  notes?: string;
}

@Injectable()
export class BookingTransportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async getTransportAssignment(bookingId: number, requesterId: number, requesterRole: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true, transportAssignment: true },
    });
    if (!booking) throw new NotFoundException(`Booking #${bookingId} không tồn tại`);

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(requesterRole);
    if (!isAdmin && booking.userId !== requesterId) {
      throw new ForbiddenException('Không có quyền truy cập booking này');
    }

    return booking.transportAssignment ?? null;
  }

  async assignTransport(
    bookingId: number,
    dto: AssignBookingTransportDto,
    adminId: number,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingCode: true,
        status: true,
        paymentStatus: true,
        user: { select: { fullName: true, email: true } },
        tour: { select: { name: true } },
      },
    });
    if (!booking) throw new NotFoundException(`Booking #${bookingId} không tồn tại`);
    if (booking.status !== 'CONFIRMED') {
      throw new ForbiddenException('Chỉ có thể gán phương tiện cho booking đã CONFIRMED');
    }
    if (booking.paymentStatus !== 'PAID') {
      throw new ForbiddenException('Chỉ có thể gán phương tiện cho booking đã thanh toán');
    }

    const data = {
      outboundTicketCodes: dto.outboundTicketCodes ?? [],
      outboundSeatNumbers: dto.outboundSeatNumbers ?? [],
      outboundPnrCode: dto.outboundPnrCode ?? null,
      returnTicketCodes: dto.returnTicketCodes ?? [],
      returnSeatNumbers: dto.returnSeatNumbers ?? [],
      returnPnrCode: dto.returnPnrCode ?? null,
      vehiclePlate: dto.vehiclePlate ?? null,
      seatNumbers: dto.seatNumbers ?? [],
      notes: dto.notes ?? null,
      assignedById: adminId,
    };

    const result = await this.prisma.bookingTransportAssignment.upsert({
      where: { bookingId },
      create: { bookingId, ...data },
      update: data,
    });

    void this.mailService.sendTransportAssignedEmail({
      to: booking.user.email,
      customerName: booking.user.fullName,
      bookingCode: booking.bookingCode,
      tourName: booking.tour?.name ?? '',
      outboundTicketCodes: data.outboundTicketCodes,
      outboundSeatNumbers: data.outboundSeatNumbers,
      outboundPnrCode: data.outboundPnrCode,
      returnTicketCodes: data.returnTicketCodes,
      returnSeatNumbers: data.returnSeatNumbers,
      returnPnrCode: data.returnPnrCode,
      vehiclePlate: data.vehiclePlate,
      seatNumbers: data.seatNumbers,
      notes: data.notes,
    });

    return result;
  }
}
