import { BookingCancellationService } from './booking-cancellation.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentService } from '../payment/payment.service';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';
import { ConfigService } from '@nestjs/config';

function createServiceHarness() {
  const txBookingUpdate = jest.fn().mockResolvedValue({});
  const txBookingUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const txTourUpdate = jest.fn().mockResolvedValue({});
  const txTourDepartureUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const paymentTransactionCreate = jest.fn().mockResolvedValue({});
  const paymentTransactionFindFirst = jest.fn().mockResolvedValue(null);
  const paymentTransactionUpdate = jest.fn().mockResolvedValue({});

  const tx = {
    booking: {
      update: txBookingUpdate,
      updateMany: txBookingUpdateMany,
    },
    tour: {
      update: txTourUpdate,
    },
    tourDeparture: {
      updateMany: txTourDepartureUpdateMany,
    },
    paymentTransaction: {
      create: paymentTransactionCreate,
      findFirst: paymentTransactionFindFirst,
      update: paymentTransactionUpdate,
    },
  };

  const bookingFindUnique = jest.fn();
  const tourDepartureFindUnique = jest.fn().mockResolvedValue({
    departureDate: new Date('2099-01-10T10:00:00.000Z'),
  });
  const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
    Promise.resolve(callback(tx)),
  );

  const prisma = {
    booking: {
      findUnique: bookingFindUnique,
    },
    tourDeparture: {
      findUnique: tourDepartureFindUnique,
    },
    paymentTransaction: {
      create: paymentTransactionCreate,
    },
    $transaction: transaction,
  } as unknown as PrismaService;

  const sendRefundCompleted = jest.fn().mockResolvedValue({});
  const mailService = {
    sendCancelRequestConfirmation: jest.fn().mockResolvedValue({}),
    sendCancellationApproved: jest.fn().mockResolvedValue({}),
    sendCancellationRejected: jest.fn().mockResolvedValue({}),
    sendRefundCompleted,
  } as unknown as MailService;

  const paymentService = {
    cancelPaymentLink: jest.fn().mockResolvedValue({}),
  } as unknown as PaymentService;

  const adminNotifications = {
    createSafe: jest.fn().mockResolvedValue({}),
  } as unknown as AdminNotificationService;

  const configService = {
    get: jest.fn().mockReturnValue(undefined),
  } as unknown as ConfigService;

  const service = new BookingCancellationService(
    prisma,
    mailService,
    paymentService,
    adminNotifications,
    configService,
  );

  return {
    service,
    bookingFindUnique,
    txBookingUpdate,
    txBookingUpdateMany,
    txTourUpdate,
    txTourDepartureUpdateMany,
    paymentTransactionCreate,
    paymentTransactionFindFirst,
    paymentTransactionUpdate,
    sendRefundCompleted,
  };
}

const baseBooking = {
  id: 1,
  bookingCode: 'BKG-010199-TEST',
  userId: 7,
  tourId: 10,
  departureId: 20,
  numberOfPeople: 2,
  totalPrice: 2_000_000,
  createdAt: new Date('2099-01-01T10:00:00.000Z'),
  refundAmount: 0,
  refundNote: null,
  user: null,
  tour: {
    id: 10,
    name: 'Test tour',
    startDate: new Date('2099-01-10T10:00:00.000Z'),
  },
};

describe('BookingCancellationService seat release', () => {
  it('restores only departure seats when customer cancels a pending booking', async () => {
    const {
      service,
      bookingFindUnique,
      txTourUpdate,
      txTourDepartureUpdateMany,
    } = createServiceHarness();
    bookingFindUnique.mockResolvedValue({
      ...baseBooking,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
    });

    await service.requestCancellation(1, 7, 'Change of plan');

    expect(txTourDepartureUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 20,
        tourId: 10,
      },
      data: {
        availableSeats: { increment: 2 },
      },
    });
    expect(txTourUpdate).not.toHaveBeenCalled();
  });

  it('restores only departure seats when admin approves a cancellation request', async () => {
    const {
      service,
      bookingFindUnique,
      txTourUpdate,
      txTourDepartureUpdateMany,
      paymentTransactionCreate,
    } = createServiceHarness();
    bookingFindUnique.mockResolvedValue({
      ...baseBooking,
      status: 'CANCEL_REQUESTED',
      paymentStatus: 'PAID',
      refundAmount: 0,
    });

    await service.approveCancellation(1, 'Approved');

    expect(txTourDepartureUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 20,
        tourId: 10,
      },
      data: {
        availableSeats: { increment: 2 },
      },
    });
    expect(txTourUpdate).not.toHaveBeenCalled();
    expect(paymentTransactionCreate).not.toHaveBeenCalled();
  });
});

describe('BookingCancellationService confirmRefund', () => {
  it('marks the pending refund SUCCESS and stamps refundedAt on the booking', async () => {
    const {
      service,
      bookingFindUnique,
      txBookingUpdateMany,
      paymentTransactionFindFirst,
      paymentTransactionUpdate,
      sendRefundCompleted,
    } = createServiceHarness();
    bookingFindUnique.mockResolvedValue({
      id: 1,
      bookingCode: 'BKG-010199-TEST',
      status: 'CANCELLED',
      refundAmount: 500_000,
      refundedAt: null,
      refundNote: 'Hoàn 50%',
      user: { email: 'khach@example.com', fullName: 'Nguyen Van A' },
      tour: { name: 'Test tour' },
    });
    paymentTransactionFindFirst.mockResolvedValue({ id: 99 });

    const result = await service.confirmRefund(1, 42, { note: 'CK Vietcombank' });

    expect(result.refundAmount).toBe(500_000);
    expect(sendRefundCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'khach@example.com',
        bookingCode: 'BKG-010199-TEST',
        refundAmount: 500_000,
      }),
    );
    expect(txBookingUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, status: 'CANCELLED', refundedAt: null },
        data: expect.objectContaining({ refundedAt: expect.any(Date) }),
      }),
    );
    expect(paymentTransactionUpdate).toHaveBeenCalledWith({
      where: { id: 99 },
      data: expect.objectContaining({
        status: 'SUCCESS',
        confirmedSource: 'REFUND_MANUAL',
        confirmedById: 42,
      }),
    });
  });

  it('rejects when the booking has no refund amount', async () => {
    const { service, bookingFindUnique } = createServiceHarness();
    bookingFindUnique.mockResolvedValue({
      id: 1,
      status: 'CANCELLED',
      refundAmount: 0,
      refundedAt: null,
      refundNote: null,
    });

    await expect(service.confirmRefund(1, 42, {})).rejects.toThrow(
      'Don nay khong phat sinh khoan hoan tien',
    );
  });

  it('rejects when the refund was already confirmed', async () => {
    const { service, bookingFindUnique } = createServiceHarness();
    bookingFindUnique.mockResolvedValue({
      id: 1,
      status: 'CANCELLED',
      refundAmount: 500_000,
      refundedAt: new Date('2099-01-05T10:00:00.000Z'),
      refundNote: null,
    });

    await expect(service.confirmRefund(1, 42, {})).rejects.toThrow(
      'Khoan hoan tien da duoc xac nhan truoc do',
    );
  });
});
