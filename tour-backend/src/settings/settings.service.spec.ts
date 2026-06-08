import { SettingsService } from './settings.service';

describe('SettingsService', () => {
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
              key: 'announcement_text',
              value: '',
              label: 'Nội dung thông báo',
              description: null,
              group: 'announcement',
              updatedAt: new Date('2026-06-08T00:00:00.000Z'),
              updatedBy: null,
            },
          ]),
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
    expect(result.announcement[0]).toMatchObject({
      key: 'announcement_text',
      updatedByName: null,
    });
  });
});
