import { SettingsService } from './settings.service';

const CURRENT_SETTINGS = [
  { key: 'company_name', value: 'Azure Horizon', label: 'Tên công ty', group: 'company' },
  { key: 'company_address', value: '123 Nguyễn Huệ', label: 'Địa chỉ', group: 'company' },
  { key: 'company_phone', value: '+84 900 888 999', label: 'Điện thoại', group: 'company' },
  { key: 'company_email', value: 'support@azurehorizon.vn', label: 'Email', group: 'company' },
  { key: 'company_description', value: 'Slogan', label: 'Mô tả', group: 'company' },
  { key: 'booking_hold_minutes', value: '15', label: 'Thời gian giữ chỗ', group: 'booking' },
  { key: 'booking_max_people', value: '20', label: 'Số khách tối đa', group: 'booking' },
  { key: 'booking_min_people', value: '1', label: 'Số khách tối thiểu', group: 'booking' },
];

function makePrisma() {
  const prisma = {
    systemSetting: {
      findMany: jest.fn()
        .mockResolvedValueOnce(CURRENT_SETTINGS.map(s => ({ key: s.key }))) // ensureDefaultSettings
        .mockResolvedValueOnce(CURRENT_SETTINGS),                            // updateMany current
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    systemLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockImplementation((fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
  };
  return prisma;
}

describe('SettingsService', () => {
  describe('updateMany — role-based access control', () => {
    it('allows ADMIN to edit booking settings', async () => {
      const service = new SettingsService(makePrisma() as never);
      await expect(
        service.updateMany({ booking_hold_minutes: '20' }, 1, 'ADMIN'),
      ).resolves.toMatchObject({ updated: 1 });
    });

    it('allows ADMIN to edit company settings', async () => {
      const service = new SettingsService(makePrisma() as never);
      await expect(
        service.updateMany({ company_name: 'New Name' }, 1, 'ADMIN'),
      ).resolves.toMatchObject({ updated: 1 });
    });

    it('allows SUPER_ADMIN to edit booking settings', async () => {
      const service = new SettingsService(makePrisma() as never);
      await expect(
        service.updateMany({ booking_hold_minutes: '30' }, 1, 'SUPER_ADMIN'),
      ).resolves.toMatchObject({ updated: 1 });
    });
  });

  it('groups settings and resolves updater names in one batch query', async () => {
    const prisma = {
      systemSetting: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              id: 1,
              key: 'company_name',
              value: 'Azure Horizon',
              label: 'Tên công ty',
              description: null,
              group: 'company',
              updatedAt: new Date('2026-06-08T00:00:00.000Z'),
              updatedBy: 7,
            },
            {
              id: 2,
              key: 'company_address',
              value: '123 Nguyễn Huệ',
              label: 'Địa chỉ',
              description: null,
              group: 'company',
              updatedAt: new Date('2026-06-08T00:00:00.000Z'),
              updatedBy: null,
            },
          ]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 7, fullName: 'Đào Thành Hà' }]),
      },
    };
    const service = new SettingsService(prisma as never);

    const result = await service.getAll();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: [7] } },
      select: { id: true, fullName: true },
    });
    expect(result.company[0]).toMatchObject({
      key: 'company_name',
      updatedBy: 7,
      updatedByName: 'Đào Thành Hà',
    });
    expect(result.company[1]).toMatchObject({
      key: 'company_address',
      updatedByName: null,
    });
  });
});
