import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TourStatus } from '@prisma/client';
import { TourWorkflowService } from './tour-workflow.service';

describe('TourWorkflowService', () => {
  const prisma = {
    tour: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const service = new TourWorkflowService(prisma as any, {} as any);

  const publishableTour = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    name: 'Ha Long Luxury Escape',
    description: 'A complete itinerary for approval.',
    price: 5_000_000,
    destinationId: 2,
    destination: {
      id: 2,
      name: 'Ha Long',
      travelScope: 'DOMESTIC',
      countryCode: 'VN',
    },
    startDate: new Date('2026-06-10T00:00:00.000Z'),
    duration: '3 days',
    availableSeats: 20,
    createdById: 7,
    status: TourStatus.DRAFT,
    departures: [
      {
        departureDate: new Date('2026-06-10T00:00:00.000Z'),
        availableSeats: 10,
        isActive: true,
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-25T00:00:00.000Z'));
    jest.clearAllMocks();
    prisma.tour.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 1, ...data }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('submits an owned draft tour for admin review', async () => {
    prisma.tour.findUnique.mockResolvedValue(publishableTour());

    await expect(service.submitForReview(1, 7)).resolves.toMatchObject({
      status: TourStatus.PENDING_REVIEW,
      reviewNote: null,
    });

    expect(prisma.tour.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: TourStatus.PENDING_REVIEW, reviewNote: null },
    });
  });

  it('blocks staff from submitting another staff member tour', async () => {
    prisma.tour.findUnique.mockResolvedValue(
      publishableTour({ createdById: 99 }),
    );

    await expect(service.submitForReview(1, 7)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.tour.update).not.toHaveBeenCalled();
  });

  it('requires a publishable tour before submit for review', async () => {
    prisma.tour.findUnique.mockResolvedValue(
      publishableTour({ departures: [] }),
    );

    await expect(service.submitForReview(1, 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.tour.update).not.toHaveBeenCalled();
  });

  it('approves a pending tour and stamps reviewer metadata', async () => {
    prisma.tour.findUnique.mockResolvedValue(
      publishableTour({ status: TourStatus.PENDING_REVIEW }),
    );

    await expect(service.reviewTour(1, 11, 'approve')).resolves.toMatchObject({
      status: TourStatus.PUBLISHED,
      reviewedById: 11,
      reviewNote: null,
    });

    expect(prisma.tour.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: TourStatus.PUBLISHED,
        reviewedById: 11,
        reviewNote: null,
        publishedAt: expect.any(Date),
      }),
    });
  });

  it('requires a rejection note when admin rejects a pending tour', async () => {
    prisma.tour.findUnique.mockResolvedValue(
      publishableTour({ status: TourStatus.PENDING_REVIEW }),
    );

    await expect(
      service.reviewTour(1, 11, 'reject', ' '),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tour.update).not.toHaveBeenCalled();
  });

  it('returns pending tours sorted oldest update first', async () => {
    prisma.tour.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.tour.count.mockResolvedValue(1);

    await expect(service.getPendingTours()).resolves.toEqual({
      data: [{ id: 1 }],
      count: 1,
    });

    expect(prisma.tour.findMany).toHaveBeenCalledWith({
      where: { status: TourStatus.PENDING_REVIEW, deletedAt: null },
      orderBy: { updatedAt: 'asc' },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            travelScope: true,
            countryCode: true,
          },
        },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  });

  it('throws not found for missing tour workflow records', async () => {
    prisma.tour.findUnique.mockResolvedValue(null);

    await expect(service.submitForReview(1, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
