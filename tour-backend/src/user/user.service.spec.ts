import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UserService } from './user.service';

describe('UserService authorization filters', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
  };
  const mailService = {};
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService(prisma as any, mailService as any);
  });

  it('limits STAFF user list to CUSTOMER accounts', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 1,
        email: 'customer@example.com',
        fullName: 'Customer',
        phone: null,
        avatarUrl: null,
        role: Role.CUSTOMER,
        createdAt: new Date(),
        deletedAt: null,
        authRevokedAt: null,
        _count: { bookings: 0, reviews: 0 },
      },
    ]);
    prisma.user.count.mockResolvedValue(1);

    await service.findAll({ page: 1, limit: 10 }, Role.STAFF);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: Role.CUSTOMER },
      }),
    );
  });

  it('returns no rows when STAFF filters only internal roles', async () => {
    const result = await service.findAll(
      { role: 'ADMIN,STAFF,SUPER_ADMIN', page: 1, limit: 10 },
      Role.STAFF,
    );

    expect(result).toEqual({
      data: [],
      meta: { totalItems: 0, totalPages: 0, currentPage: 1 },
    });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('allows ADMIN to list CUSTOMER accounts', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 1,
        email: 'customer@example.com',
        fullName: 'Customer',
        phone: null,
        avatarUrl: null,
        role: Role.CUSTOMER,
        createdAt: new Date(),
        deletedAt: null,
        authRevokedAt: null,
        _count: { bookings: 0, reviews: 0 },
      },
    ]);
    prisma.user.count.mockResolvedValue(1);

    await service.findAll({ role: 'CUSTOMER', page: 1, limit: 10 }, Role.ADMIN);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: Role.CUSTOMER },
      }),
    );
  });

  it('blocks ADMIN from listing ADMIN and SUPER_ADMIN accounts', async () => {
    const result = await service.findAll(
      { role: 'ADMIN,SUPER_ADMIN', page: 1, limit: 10 },
      Role.ADMIN,
    );

    expect(result).toEqual({
      data: [],
      meta: { totalItems: 0, totalPages: 0, currentPage: 1 },
    });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('hides non-customer detail from STAFF', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 2,
      email: 'admin@example.com',
      fullName: 'Admin',
      phone: null,
      avatarUrl: null,
      dob: null,
      gender: null,
      role: Role.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      authRevokedAt: null,
      _count: { bookings: 0, reviews: 0 },
    });

    await expect(service.findOne(2, Role.STAFF)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  it('allows ADMIN to view customer detail', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 3,
      email: 'customer@example.com',
      fullName: 'Customer',
      phone: null,
      avatarUrl: null,
      dob: null,
      gender: null,
      role: Role.CUSTOMER,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      authRevokedAt: null,
      _count: { bookings: 0, reviews: 0 },
    });
    prisma.booking.findMany.mockResolvedValue([]);

    await expect(service.findOne(3, Role.ADMIN)).resolves.toMatchObject({
      id: 3,
      role: Role.CUSTOMER,
    });
  });

  it('returns only customer stats for STAFF', async () => {
    prisma.user.count.mockResolvedValueOnce(12);
    prisma.user.count.mockResolvedValueOnce(10);
    prisma.user.count.mockResolvedValueOnce(3);

    await expect(service.getStats(Role.STAFF)).resolves.toMatchObject({
      totalUsers: 12,
      activeUsers: 10,
      newThisMonth: 3,
      staffAndAdmin: 0,
      roleBreakdown: [{ role: Role.CUSTOMER, count: 12 }],
    });
    expect(prisma.user.count).toHaveBeenCalledTimes(3);
  });
});
