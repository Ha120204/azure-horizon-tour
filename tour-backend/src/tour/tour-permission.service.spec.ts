import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, TourStatus } from '@prisma/client';
import { TourPermissionService } from './tour-permission.service';

describe('TourPermissionService', () => {
  const prisma = {
    tour: {
      findFirst: jest.fn(),
    },
  };

  let service: TourPermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TourPermissionService(prisma as any);
  });

  it.each([Role.ADMIN, Role.SUPER_ADMIN])(
    'allows %s to mutate any existing non-deleted tour',
    async (role) => {
      const tour = {
        id: 1,
        createdById: 10,
        status: TourStatus.PUBLISHED,
      };
      prisma.tour.findFirst.mockResolvedValue(tour);

      await expect(
        service.assertCanMutateTour(1, 99, role),
      ).resolves.toEqual(tour);
    },
  );

  it.each([TourStatus.DRAFT, TourStatus.REJECTED])(
    'allows STAFF to mutate own %s tour',
    async (status) => {
      const tour = { id: 1, createdById: 10, status };
      prisma.tour.findFirst.mockResolvedValue(tour);

      await expect(
        service.assertCanMutateTour(1, 10, Role.STAFF),
      ).resolves.toEqual(tour);
    },
  );

  it('blocks STAFF from mutating another staff tour', async () => {
    prisma.tour.findFirst.mockResolvedValue({
      id: 1,
      createdById: 10,
      status: TourStatus.DRAFT,
    });

    await expect(
      service.assertCanMutateTour(1, 11, Role.STAFF),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    TourStatus.PENDING_REVIEW,
    TourStatus.PUBLISHED,
    TourStatus.COMPLETED,
  ])('blocks STAFF from mutating own %s tour', async (status) => {
    prisma.tour.findFirst.mockResolvedValue({
      id: 1,
      createdById: 10,
      status,
    });

    await expect(
      service.assertCanMutateTour(1, 10, Role.STAFF),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws not found when the tour does not exist or is deleted', async () => {
    prisma.tour.findFirst.mockResolvedValue(null);

    await expect(
      service.assertCanMutateTour(1, 10, Role.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
