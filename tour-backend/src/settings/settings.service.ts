import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SettingType = 'text' | 'email' | 'phone' | 'integer' | 'boolean';

type SettingDefinition = {
  key: string;
  type: SettingType;
  min?: number;
  max?: number;
  maxLength?: number;
  required?: boolean;
};

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

const SETTING_DEFINITIONS: Record<string, SettingDefinition> = {
  company_name: { key: 'company_name', type: 'text', required: true, maxLength: 120 },
  company_address: { key: 'company_address', type: 'text', required: true, maxLength: 250 },
  company_phone: { key: 'company_phone', type: 'phone', required: true, maxLength: 32 },
  company_email: { key: 'company_email', type: 'email', required: true, maxLength: 120 },
  company_description: { key: 'company_description', type: 'text', maxLength: 180 },
  booking_hold_minutes: { key: 'booking_hold_minutes', type: 'integer', min: 5, max: 120, required: true },
  booking_max_people: { key: 'booking_max_people', type: 'integer', min: 1, max: 99, required: true },
  booking_min_people: { key: 'booking_min_people', type: 'integer', min: 1, max: 99, required: true },
  announcement_enabled: { key: 'announcement_enabled', type: 'boolean', required: true },
  announcement_text: { key: 'announcement_text', type: 'text', maxLength: 240 },
};

const validateSettingValue = (definition: SettingDefinition, rawValue: string) => {
  const value = String(rawValue ?? '').trim();

  if (definition.required && value.length === 0) {
    throw new BadRequestException(`${definition.key} không được để trống`);
  }

  if (definition.maxLength && value.length > definition.maxLength) {
    throw new BadRequestException(`${definition.key} không được vượt quá ${definition.maxLength} ký tự`);
  }

  if (definition.type === 'boolean') {
    if (value !== 'true' && value !== 'false') {
      throw new BadRequestException(`${definition.key} chỉ nhận true hoặc false`);
    }
    return value;
  }

  if (definition.type === 'integer') {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue)) {
      throw new BadRequestException(`${definition.key} phải là số nguyên`);
    }
    if (definition.min !== undefined && numberValue < definition.min) {
      throw new BadRequestException(`${definition.key} phải lớn hơn hoặc bằng ${definition.min}`);
    }
    if (definition.max !== undefined && numberValue > definition.max) {
      throw new BadRequestException(`${definition.key} phải nhỏ hơn hoặc bằng ${definition.max}`);
    }
    return String(numberValue);
  }

  if (definition.type === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new BadRequestException(`${definition.key} phải là email hợp lệ`);
    }
    return value.toLowerCase();
  }

  if (definition.type === 'phone') {
    if (!/^\+?[0-9\s().-]{8,32}$/.test(value)) {
      throw new BadRequestException(`${definition.key} phải là số điện thoại hợp lệ`);
    }
    return value;
  }

  return value;
};

export interface PublicSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_description: string;
  announcement_enabled: string;
  announcement_text: string;
}

type SystemHealthStatus = 'ok' | 'warning' | 'error';

export interface SystemHealthItem {
  key: string;
  label: string;
  status: SystemHealthStatus;
  message: string;
  latencyMs?: number;
}

export interface SystemHealth {
  checkedAt: string;
  uptimeSeconds: number;
  items: SystemHealthItem[];
}

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  private hasAllEnv(keys: string[]) {
    return keys.every(key => Boolean(process.env[key]?.trim()));
  }

  private missingEnv(keys: string[]) {
    return keys.filter(key => !process.env[key]?.trim());
  }

  private async ensureDefaultSettings() {
    const existing = await this.prisma.systemSetting.findMany({
      where: { key: { in: DEFAULT_SETTINGS.map(setting => setting.key) } },
      select: { key: true },
    });
    const existingKeys = new Set(existing.map(setting => setting.key));
    const missing = DEFAULT_SETTINGS.filter(setting => !existingKeys.has(setting.key));

    if (missing.length > 0) {
      await this.prisma.systemSetting.createMany({ data: missing });
      console.log('✅ SystemSetting: seeded missing settings', missing.map(setting => setting.key).join(', '));
    }
  }

  /**
   * Tự động seed giá trị mặc định khi bảng SystemSetting rỗng
   */
  async onModuleInit() {
    await this.ensureDefaultSettings();
  }

  /**
   * GET /settings — Trả về toàn bộ settings (grouped)
   * Public: tất cả các role đều đọc được
   */
  async getAll() {
    await this.ensureDefaultSettings();

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
    await this.ensureDefaultSettings();

    const settings = await this.prisma.systemSetting.findMany();
    const flat: Record<string, string> = {};
    for (const s of settings) flat[s.key] = s.value;
    return flat;
  }

  /**
   * Public: chỉ trả các cấu hình an toàn để hiển thị ngoài website.
   */
  async getPublic(): Promise<PublicSettings> {
    await this.ensureDefaultSettings();

    const allowedKeys = [
      'company_name',
      'company_address',
      'company_phone',
      'company_email',
      'company_description',
      'announcement_enabled',
      'announcement_text',
    ];
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: allowedKeys } },
    });
    const flat: Record<string, string> = {};
    for (const s of settings) flat[s.key] = s.value;
    return {
      company_name: flat.company_name ?? 'Azure Horizon',
      company_address: flat.company_address ?? '',
      company_phone: flat.company_phone ?? '',
      company_email: flat.company_email ?? '',
      company_description: flat.company_description ?? '',
      announcement_enabled: flat.announcement_enabled ?? 'false',
      announcement_text: flat.announcement_text ?? '',
    };
  }

  /**
   * PATCH /settings — Cập nhật một hoặc nhiều settings
   * Chỉ SUPER_ADMIN
   * @param updates  Record<key, value>
   * @param adminId  ID người thực hiện
   */
  async getHealth(): Promise<SystemHealth> {
    const items: SystemHealthItem[] = [
      {
        key: 'api',
        label: 'Backend API',
        status: 'ok',
        message: 'Endpoint /settings/health phản hồi và JWT hợp lệ.',
      },
      {
        key: 'auth',
        label: 'Xác thực quản trị',
        status: this.hasAllEnv(['JWT_SECRET']) ? 'ok' : 'warning',
        message: this.hasAllEnv(['JWT_SECRET'])
          ? 'JWT_SECRET đã được cấu hình.'
          : 'JWT_SECRET chưa được cấu hình rõ ràng trong môi trường.',
      },
    ];

    const databaseStartedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - databaseStartedAt;
      items.push({
        key: 'database',
        label: 'Database',
        status: latencyMs > 500 ? 'warning' : 'ok',
        latencyMs,
        message: 'Prisma kết nối PostgreSQL thành công.',
      });
    } catch {
      items.push({
        key: 'database',
        label: 'Database',
        status: 'error',
        latencyMs: Date.now() - databaseStartedAt,
        message: 'Không thể thực hiện health query tới database.',
      });
    }

    try {
      const publicSettings = await this.getPublic();
      const missingPublicSettings = ['company_name', 'company_phone', 'company_email']
        .filter(key => !publicSettings[key as keyof PublicSettings]);
      items.push({
        key: 'public_settings',
        label: 'Cấu hình công khai',
        status: missingPublicSettings.length > 0 ? 'warning' : 'ok',
        message: missingPublicSettings.length > 0
          ? `Thiếu thông tin công khai: ${missingPublicSettings.join(', ')}.`
          : 'Thông tin công ty và liên hệ công khai đã sẵn sàng.',
      });
    } catch {
      items.push({
        key: 'public_settings',
        label: 'Cấu hình công khai',
        status: 'error',
        message: 'Không đọc được public settings từ database.',
      });
    }

    const payosKeys = ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'];
    const missingPayosKeys = this.missingEnv(payosKeys);
    items.push({
      key: 'payos',
      label: 'PayOS / Webhook',
      status: missingPayosKeys.length > 0 ? 'warning' : 'ok',
      message: missingPayosKeys.length > 0
        ? `Thiếu cấu hình: ${missingPayosKeys.join(', ')}.`
        : 'Credential PayOS đã đủ; webhook có thể nhận callback thanh toán.',
    });

    const mailKeys = ['MAIL_USER', 'MAIL_PASS'];
    const missingMailKeys = this.missingEnv(mailKeys);
    items.push({
      key: 'email',
      label: 'Email Service',
      status: missingMailKeys.length > 0 ? 'warning' : 'ok',
      message: missingMailKeys.length > 0
        ? `Thiếu cấu hình: ${missingMailKeys.join(', ')}.`
        : 'SMTP credential đã đủ để gửi email hệ thống.',
    });

    return {
      checkedAt: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      items,
    };
  }

  async updateMany(updates: Record<string, string>, adminId: number) {
    await this.ensureDefaultSettings();

    const entries = Object.entries(updates ?? {});
    if (entries.length === 0) {
      return { message: 'Không có thay đổi nào', updated: 0 };
    }

    const unknownKeys = entries
      .map(([key]) => key)
      .filter(key => !SETTING_DEFINITIONS[key]);

    if (unknownKeys.length > 0) {
      throw new BadRequestException(`Cài đặt không hợp lệ: ${unknownKeys.join(', ')}`);
    }

    const currentSettings = await this.prisma.systemSetting.findMany({
      where: { key: { in: DEFAULT_SETTINGS.map(setting => setting.key) } },
    });
    const currentByKey = new Map(currentSettings.map(setting => [setting.key, setting]));
    const missingKeys = entries.map(([key]) => key).filter(key => !currentByKey.has(key));

    if (missingKeys.length > 0) {
      throw new BadRequestException(`Cài đặt chưa tồn tại trong hệ thống: ${missingKeys.join(', ')}`);
    }

    const normalized: Record<string, string> = {};
    for (const [key, value] of entries) {
      normalized[key] = validateSettingValue(SETTING_DEFINITIONS[key], value);
    }

    const merged = Object.fromEntries(
      DEFAULT_SETTINGS.map(setting => [setting.key, currentByKey.get(setting.key)?.value ?? setting.value]),
    );
    for (const [key, value] of Object.entries(normalized)) {
      merged[key] = value;
    }

    const minPeople = Number(merged.booking_min_people);
    const maxPeople = Number(merged.booking_max_people);
    if (Number.isFinite(minPeople) && Number.isFinite(maxPeople) && minPeople > maxPeople) {
      throw new BadRequestException('Số khách tối thiểu không được lớn hơn số khách tối đa');
    }

    if (merged.announcement_enabled === 'true' && !String(merged.announcement_text ?? '').trim()) {
      throw new BadRequestException('Vui lòng nhập nội dung thông báo trước khi bật banner bảo trì');
    }

    const changes = entries
      .map(([key]) => {
        const before = currentByKey.get(key);
        const nextValue = normalized[key];
        if (!before || before.value === nextValue) return null;
        return {
          key,
          label: before.label,
          before: before.value,
          after: nextValue,
        };
      })
      .filter((change): change is { key: string; label: string; before: string; after: string } => Boolean(change));

    if (changes.length === 0) {
      return { message: 'Không có thay đổi nào', updated: 0 };
    }

    await this.prisma.$transaction(async tx => {
      await Promise.all(
        changes.map(change =>
          tx.systemSetting.update({
            where: { key: change.key },
            data: { value: change.after, updatedBy: adminId },
          }),
        ),
      );

      await tx.systemLog.create({
        data: {
          action: 'UPDATE',
          resource: 'SystemSetting',
          resourceId: 'settings',
          targetName: 'Cài đặt hệ thống',
          description: `Cập nhật ${changes.length} cài đặt hệ thống`,
          oldData: Object.fromEntries(changes.map(change => [change.key, change.before])),
          newData: Object.fromEntries(changes.map(change => [change.key, change.after])),
          userId: adminId,
        },
      });
    });

    return { message: 'Cập nhật cài đặt thành công', updated: changes.length, changes };
  }
}
