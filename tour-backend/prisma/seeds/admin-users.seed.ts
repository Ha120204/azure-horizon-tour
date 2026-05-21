import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type AdminUserSeed = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: Role;
};

const adminUsers: AdminUserSeed[] = [
  {
    email: 'daothanhha120204@gmail.com',
    password: 'Ha12022004@',
    fullName: 'Đào Thành Hà',
    phone: '0386761856',
    role: Role.ADMIN,
  },
  {
    email: 'phunghuyen23112004@gmail.com',
    password: 'Huyen23112004@',
    fullName: 'Phùng Thị Thu Huyền',
    phone: '0385773898',
    role: Role.STAFF,
  },
];

export async function seedAdminUsers(prisma: PrismaClient) {
  for (const user of adminUsers) {
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
