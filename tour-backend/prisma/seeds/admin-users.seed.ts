import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type AdminUserSeed = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: Role;
};

// Thông tin đăng nhập admin/staff đọc từ biến môi trường — KHÔNG hardcode credential
// vào source. Thiếu env tương ứng thì bỏ qua tài khoản đó (kèm cảnh báo).
const adminUsers: AdminUserSeed[] = [
  {
    email: process.env.SEED_SUPER_ADMIN_EMAIL ?? '',
    password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? '',
    fullName: 'Đào Thành Hà',
    phone: '0386761856',
    role: Role.SUPER_ADMIN,
  },
  {
    email: process.env.SEED_STAFF_EMAIL ?? '',
    password: process.env.SEED_STAFF_PASSWORD ?? '',
    fullName: 'Phùng Thị Thu Huyền',
    phone: '0385773898',
    role: Role.STAFF,
  },
];

export async function seedAdminUsers(prisma: PrismaClient) {
  for (const user of adminUsers) {
    if (!user.email || !user.password) {
      console.warn(
        `[seed] Bỏ qua tài khoản ${user.role}: thiếu biến môi trường email/password tương ứng.`,
      );
      continue;
    }
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        deletedAt: null,
        authTokenVersion: { increment: 1 },
        authRevokedAt: new Date(),
      },
      create: {
        email: user.email,
        password: hashedPassword,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      },
    });
  }

  const roleCounts = await prisma.user.groupBy({
    by: ['role'],
    where: {
      email: { in: adminUsers.map((user) => user.email) },
      deletedAt: null,
    },
    _count: { role: true },
    orderBy: { role: 'asc' },
  });

  console.table(
    roleCounts.map((row) => ({
      role: row.role,
      count: row._count.role,
    })),
  );
}
