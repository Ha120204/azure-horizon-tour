import { BookingCancellationService } from './booking-cancellation.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentService } from '../payment/payment.service';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';

function createServiceHarness() {
  const txBookingUpdate = jest.fn().mockResolvedValue({});
  const txBookingUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const txTourUpdate = jest.fn().mockResolvedValue({});
  const txTourDepartureUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const paymentTransactionCreate = jest.fn().mockResolvedValue({});

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

  const mailService = {
    sendCancelRequestConfirmation: jest.fn().mockResolvedValue({}),
    sendCancellationApproved: jest.fn().mockResolvedValue({}),
    sendCancellationRejected: jest.fn().mockResolvedValue({}),
  } as unknown as MailService;

  const paymentService = {
    cancelPaymentLink: jest.fn().mockResolvedValue({}),
  } as unknown as PaymentService;

  const adminNotifications = {
    createSafe: jest.fn().mockResolvedValue({}),
  } as unknown as AdminNotificationService;

  const service = new BookingCancellationService(
    prisma,
    mailService,
    paymentService,
    adminNotifications,
  );

  return {
    service,
    bookingFindUnique,
    txBookingUpdate,
    txBookingUpdateMany,
    txTourUpdate,
    txTourDepartureUpdateMany,
    paymentTransactionCreate,
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
  it('restores tour and departure seats when customer cancels a pending booking', async () => {
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

    expect(txTourUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        availableSeats: { increment: 2 },
      },
    });
    expect(txTourDepartureUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 20,
        tourId: 10,
      },
      data: {
        availableSeats: { increment: 2 },
      },
    });
  });

  it('restores tour and departure seats when admin approves a cancellation request', async () => {
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

    expect(txTourUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        availableSeats: { increment: 2 },
      },
    });
    expect(txTourDepartureUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 20,
        tourId: 10,
      },
      data: {
        availableSeats: { increment: 2 },
      },
    });
    expect(paymentTransactionCreate).not.toHaveBeenCalled();
  });
});
