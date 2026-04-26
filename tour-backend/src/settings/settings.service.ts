import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ── Giá trị mặc định được seed khi bảng rỗng ────────────────────────────────
const DEFAULT_SETTINGS = [
  // --- Nhóm: Thông tin công ty ---
  {
    key: 'company_name',
    value: 'Azure Horizon',
    label: 'Tên công ty',
    description: 'Tên hiển thị trên email, footer và các tài liệu hệ thống',
    group: 'company',
  },
  {
    key: 'company_address',
    value: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    label: 'Địa chỉ',
    description: 'Địa chỉ văn phòng chính',
    group: 'company',
  },
  {
    key: 'company_phone',
    value: '+84 900 888 999',
    label: 'Số điện thoại hotline',
    description: 'Hotline hỗ trợ khách hàng (hiển thị trên email vé)',
    group: 'company',
  },
  {
    key: 'company_email',
    value: 'support@azurehorizon.vn',
    label: 'Email hỗ trợ',
    description: 'Email liên hệ hỗ trợ khách hàng',
    group: 'company',
  },
  {
    key: 'company_description',
    value: 'Hành trình đẳng cấp — Trải nghiệm xa xỉ',
    label: 'Slogan / Mô tả ngắn',
    description: 'Xuất hiện trên email và trang giới thiệu',
    group: 'company',
  },
  // --- Nhóm: Chính sách đặt tour ---
  {
    key: 'booking_hold_minutes',
    value: '15',
    label: 'Thời gian giữ chỗ (phút)',
    description: 'Số phút hệ thống giữ ghế trước khi tự động huỷ nếu chưa thanh toán',
    group: 'booking',
  },
  {
    key: 'booking_max_people',
    value: '20',
    label: 'Số khách tối đa / lượt đặt',
    description: 'Số lượng hành khách tối đa một lần đặt tour',
    group: 'booking',
  },
  {
    key: 'booking_min_people',
    value: '1',
    label: 'Số khách tối thiểu / lượt đặt',
    description: 'Số lượng hành khách tối thiểu một lần đặt tour',
    group: 'booking',
  },
  // --- Nhóm: Thông báo hệ thống ---
  {
    key: 'announcement_enabled',
    value: 'false',
    label: 'Bật thông báo bảo trì',
    description: 'Hiển thị banner thông báo trên trang chủ khi hệ thống bảo trì',
    group: 'announcement',
  },
  {
    key: 'announcement_text',
    value: '',
    label: 'Nội dung thông báo',
    description: 'Nội dung banner thông báo (để trống nếu không có)',
    group: 'announcement',
  },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  /**
   * Tự động seed giá trị mặc định khi bảng SystemSetting rỗng
   */
  async onModuleInit() {
    const count = await this.prisma.systemSetting.count();
    if (count === 0) {
      await this.prisma.systemSetting.createMany({ data: DEFAULT_SETTINGS });
      console.log('✅ SystemSetting: seeded', DEFAULT_SETTINGS.length, 'default settings');
    }
  }

  /**
   * GET /settings — Trả về toàn bộ settings (grouped)
   * Public: tất cả các role đều đọc được
   */
  async getAll() {
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: [{ group: 'asc' }, { id: 'asc' }],
    });

    // Group theo key "group"
    const grouped: Record<string, any[]> = {};
    for (const s of settings) {
      if (!grouped[s.group]) grouped[s.group] = [];
      grouped[s.group].push(s);
    }
    return grouped;
  }

  /**
   * GET /settings/flat — Trả về object phẳng key→value
   * Tiện dụng cho frontend dùng trực tiếp
   */
  async getFlat(): Promise<Record<string, string>> {
    const settings = await this.prisma.systemSetting.findMany();
    const flat: Record<string, string> = {};
    for (const s of settings) flat[s.key] = s.value;
    return flat;
  }

  /**
   * PATCH /settings — Cập nhật một hoặc nhiều settings
   * Chỉ ADMIN và SUPER_ADMIN
   * @param updates  Record<key, value>
   * @param adminId  ID người thực hiện
   */
  async updateMany(updates: Record<string, string>, adminId: number) {
    const results: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      const updated = await this.prisma.systemSetting.updateMany({
        where: { key },
        data: { value, updatedBy: adminId },
      });
      results.push({ key, updated: updated.count });
    }

    return { message: 'Cập nhật cài đặt thành công', updated: results.length };
  }
}
