import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SuperAdminService view grants', () => {
  let service: SuperAdminService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new SuperAdminService(
      prisma as unknown as PrismaService,
      { get: jest.fn() } as unknown as ConfigService,
    );
  });

  describe('getViewGrants', () => {
    it('throws when userId is missing', async () => {
      await expect(service.getViewGrants(undefined)).rejects.toThrow(BadRequestException);
    });

    it('returns the persisted grants', async () => {
      prisma.user.findUnique.mockResolvedValue({ superAdminViewGrants: ['bookings', 'tours'] });
      await expect(service.getViewGrants(1)).resolves.toEqual({ grants: ['bookings', 'tours'] });
    });

    it('returns an empty list when the user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getViewGrants(1)).resolves.toEqual({ grants: [] });
    });
  });

  describe('updateViewGrants', () => {
    it('throws when userId is missing', async () => {
      await expect(service.updateViewGrants(undefined, ['tours'])).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('deduplicates grants and persists them', async () => {
      prisma.user.update.mockImplementation(({ data }: { data: { superAdminViewGrants: string[] } }) =>
        Promise.resolve({ superAdminViewGrants: data.superAdminViewGrants }),
      );

      const result = await service.updateViewGrants(7, ['tours', 'tours', 'bookings']);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 7 },
          data: { superAdminViewGrants: ['tours', 'bookings'] },
        }),
      );
      expect(result).toEqual({ grants: ['tours', 'bookings'] });
    });

    it('persists an empty list to revoke all areas', async () => {
      prisma.user.update.mockResolvedValue({ superAdminViewGrants: [] });
      await expect(service.updateViewGrants(7, [])).resolves.toEqual({ grants: [] });
    });
  });
});
