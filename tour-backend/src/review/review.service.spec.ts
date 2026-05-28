import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TourStatus } from '@prisma/client';
import { ReviewService } from './review.service';

describe('ReviewService review eligibility', () => {
  const adminNotifications = {
    createSafe: jest.fn(),
  };

  const prisma = {
    tour: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
    },
    tourDeparture: {
      findUnique: jest.fn(),
    },
    review: {
      findFirst: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  let service: ReviewService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-19T00:00:00.000Z'));
    jest.clearAllMocks();
    prisma.tour.findFirst.mockResolvedValue({ id: 1 });
    prisma.review.findFirst.mockResolvedValue(null);
    prisma.review.create.mockResolvedValue({
      id: 10,
      userId: 7,
      tourId: 1,
      rating: 5,
      content: 'Great trip',
      imageUrls: [],
    });
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 5 } });
    prisma.tour.update.mockResolvedValue({});
    service = new ReviewService(prisma as any, adminNotifications as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws not found when the tour does not exist or is deleted', async () => {
    prisma.tour.findFirst.mockResolvedValue(null);

    await expect(
      service.createReview(7, 1, { rating: 5, content: 'Great trip' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.tour.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
    });
  });

  it('requires a confirmed and paid booking', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);

    await expect(
      service.createReview(7, 1, { rating: 5, content: 'Great trip' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 7,
          tourId: 1,
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        },
      }),
    );
  });

  it('blocks review before the trip completion date', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      departureId: null,
      tour: {
        startDate: new Date('2026-05-20T00:00:00.000Z'),
        duration: '3 days',
        status: TourStatus.PUBLISHED,
      },
    });

    await expect(
      service.createReview(7, 1, { rating: 5, content: 'Great trip' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('uses departure date when the booking has a departure', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      departureId: 11,
      tour: {
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        duration: '2 days',
        status: TourStatus.PUBLISHED,
      },
    });
    prisma.tourDeparture.findUnique.mockResolvedValue({
      departureDate: new Date('2026-05-20T00:00:00.000Z'),
    });

    await expect(
      service.createReview(7, 1, { rating: 5, content: 'Great trip' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.tourDeparture.findUnique).toHaveBeenCalledWith({
      where: { id: 11 },
      select: { departureDate: true },
    });
  });

  it('allows review after the trip has completed by date', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      departureId: null,
      tour: {
        startDate: new Date('2026-05-15T00:00:00.000Z'),
        duration: '3 days',
        status: TourStatus.PUBLISHED,
      },
    });

    await expect(
      service.createReview(7, 1, { rating: 5, content: 'Great trip' }),
    ).resolves.toMatchObject({ id: 10 });

    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 7, tourId: 1, rating: 5 }),
      }),
    );
  });

  it('allows review when the tour is explicitly marked completed', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      departureId: null,
      tour: {
        startDate: new Date('2026-05-25T00:00:00.000Z'),
        duration: '3 days',
        status: TourStatus.COMPLETED,
      },
    });

    await expect(
      service.createReview(7, 1, { rating: 5, content: 'Great trip' }),
    ).resolves.toMatchObject({ id: 10 });
  });
});
