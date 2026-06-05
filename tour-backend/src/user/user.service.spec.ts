import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UserService } from './user.service';

describe('UserService authorization filters', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };
  const mailService = {};
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.booking.groupBy.mockResolvedValue([]);
    prisma.booking.aggregate.mockResolvedValue({ _sum: { totalPrice: 0 }, _max: { createdAt: null } });
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

  it.each([
    ['fullName', 'asc', { fullName: 'asc' }],
    ['createdAt', 'desc', { createdAt: 'desc' }],
    ['bookingCount', 'desc', { bookings: { _count: 'desc' } }],
    ['status', 'asc', { deletedAt: 'asc' }],
  ])(
    'applies server-side %s sorting',
    async (sortBy, sortDir, expectedOrderBy) => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll(
        {
          role: 'STAFF',
          sortBy,
          sortDir,
          page: 1,
          limit: 10,
        },
        Role.ADMIN,
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: Role.STAFF },
          orderBy: expectedOrderBy,
        }),
      );
    },
  );

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
    prisma.user.count.mockResolvedValueOnce(7);

    await expect(service.getStats(Role.STAFF)).resolves.toMatchObject({
      totalUsers: 12,
      activeUsers: 10,
      newThisMonth: 3,
      customersWithBookings: 7,
      staffAndAdmin: 0,
      roleBreakdown: [{ role: Role.CUSTOMER, count: 12 }],
    });
    expect(prisma.user.count).toHaveBeenCalledTimes(4);
  });

  it('returns scoped STAFF stats for ADMIN', async () => {
    prisma.user.count.mockResolvedValueOnce(20);
    prisma.user.count.mockResolvedValueOnce(17);
    prisma.user.count.mockResolvedValueOnce(4);

    await expect(service.getStats(Role.ADMIN, Role.STAFF)).resolves.toEqual({
      scopeRole: Role.STAFF,
      totalUsers: 20,
      activeUsers: 17,
      newThisMonth: 4,
    });
    expect(prisma.user.count).toHaveBeenNthCalledWith(1, {
      where: { role: Role.STAFF },
    });
    expect(prisma.user.count).toHaveBeenNthCalledWith(2, {
      where: { role: Role.STAFF, deletedAt: null },
    });
    expect(prisma.user.count).toHaveBeenNthCalledWith(3, {
      where: {
        role: Role.STAFF,
        createdAt: { gte: expect.any(Date) },
      },
    });
  });

  it('returns scoped ADMIN stats for SUPER_ADMIN', async () => {
    prisma.user.count.mockResolvedValueOnce(6);
    prisma.user.count.mockResolvedValueOnce(5);
    prisma.user.count.mockResolvedValueOnce(1);

    await expect(
      service.getStats(Role.SUPER_ADMIN, Role.ADMIN),
    ).resolves.toMatchObject({
      scopeRole: Role.ADMIN,
      totalUsers: 6,
      activeUsers: 5,
      newThisMonth: 1,
    });
  });

  it('blocks ADMIN from requesting ADMIN stats', async () => {
    await expect(service.getStats(Role.ADMIN, Role.ADMIN)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('allows ADMIN to bulk deactivate STAFF accounts', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 10, role: Role.STAFF, deletedAt: null },
      { id: 11, role: Role.STAFF, deletedAt: null },
    ]);
    prisma.user.updateMany.mockResolvedValue({ count: 2 });

    await expect(
      service.bulkUpdateUserStatus(
        [10, 11],
        'deactivated',
        1,
        Role.ADMIN,
        Role.STAFF,
      ),
    ).resolves.toMatchObject({
      updatedCount: 2,
      skippedCount: 0,
      status: 'deactivated',
      role: Role.STAFF,
    });

    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [10, 11] }, role: Role.STAFF },
      }),
    );
  });

  it('blocks ADMIN from bulk updating ADMIN accounts', async () => {
    await expect(
      service.bulkUpdateUserStatus(
        [10],
        'deactivated',
        1,
        Role.ADMIN,
        Role.ADMIN,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('blocks bulk updates when selected ids are outside the requested role scope', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 10, role: Role.STAFF, deletedAt: null },
      { id: 11, role: Role.CUSTOMER, deletedAt: null },
    ]);

    await expect(
      service.bulkUpdateUserStatus(
        [10, 11],
        'deactivated',
        1,
        Role.ADMIN,
        Role.STAFF,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
});
