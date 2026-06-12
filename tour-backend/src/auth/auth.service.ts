import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException, HttpException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';

type RefreshTokenPayload = {
  sub: number | string;
  tokenVersion?: number;
};

type JwtTokenPayload = {
  sub: number;
  email: string;
  role: string;
  tokenVersion: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly adminNotifications: AdminNotificationService,
  ) {}

  // =========================================================
  // JWT helpers — dùng chung cho login thường và Google OAuth
  // =========================================================
  signToken(payload: JwtTokenPayload): string {
    return this.jwtService.sign(payload);
  }

  signRefreshToken(payload: { sub: number; tokenVersion: number }): string {
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  // =========================================================
  // ĐĂNG KÝ
  // =========================================================
  async register(email: string, password: string, fullName: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltOrRounds);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
      },
    });

    const { password: _, ...result } = user;
    await this.adminNotifications.createSafe({
      type: 'customer_new',
      resourceType: 'User',
      resourceId: user.id,
      title: 'Khách hàng mới đăng ký',
      body: `${user.fullName} vừa tạo tài khoản khách hàng.`,
      href: '/admin/customers',
      severity: 'info',
      targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
      metadata: {
        userId: user.id,
        email: user.email,
      },
    });
    return result;
  }

  // =========================================================
  // ĐĂNG NHẬP (email + password)
  // =========================================================
  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Tài khoản Google không có password — không cho đăng nhập bằng password
    if (!user.password) {
      throw new UnauthorizedException(
        'Tài khoản này được tạo qua Google Sign-In. Vui lòng dùng nút "Tiếp tục với Google" để đăng nhập.',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Kiểm tra tài khoản đã bị vô hiệu hóa chưa
    if (user.deletedAt) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact an administrator.');
    }

    const { password, ...result } = user;

    const payload: JwtTokenPayload = { sub: user.id, email: user.email, role: user.role, tokenVersion: user.authTokenVersion };
    const access_token = this.signToken(payload);
    const refresh_token = this.signRefreshToken({ sub: user.id, tokenVersion: user.authTokenVersion });

    return { user: result, access_token, refresh_token };
  }

  async forgotPassword(email: string, locale: 'vi' | 'en' = 'vi') {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.deletedAt) {
      throw new NotFoundException('ACCOUNT_NOT_FOUND');
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: otpHash,
        passwordResetExpiry: expiry,
      },
    });

    try {
      await this.mailService.sendPasswordResetEmail(email, otp, user.fullName, locale);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown mail error';
      console.warn('Password reset email could not be sent:', message);
    }

    return { message: 'OTP sent.' };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordResetToken || !user.passwordResetExpiry) {
      throw new BadRequestException('Invalid or expired OTP. Please request a new one.');
    }

    if (new Date() > user.passwordResetExpiry) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpHash !== user.passwordResetToken) {
      throw new BadRequestException('Invalid OTP. Please check and try again.');
    }

    return { message: 'OTP verified successfully.' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordResetToken || !user.passwordResetExpiry) {
      throw new BadRequestException('Invalid or expired OTP. Please request a new one.');
    }

    if (new Date() > user.passwordResetExpiry) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpHash !== user.passwordResetToken) {
      throw new BadRequestException('Invalid OTP. Please check and try again.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        authTokenVersion: { increment: 1 },
        authRevokedAt: new Date(),
      },
    });

    return { message: 'Password has been reset successfully' };
  }

  // =========================================================
  // REFRESH TOKEN: Cấp access_token mới khi token cũ hết hạn
  // =========================================================
  async refreshToken(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token. Please log in again.');
    }

    // Truy vấn DB lấy thông tin user mới nhất (đề phòng role đã thay đổi)
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid refresh token payload. Please log in again.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found.');
    }

    const tokenVersion = payload.tokenVersion ?? 0;
    if (tokenVersion !== user.authTokenVersion) {
      throw new UnauthorizedException('Refresh token has been revoked. Please log in again.');
    }

    // Sinh access_token mới (kế thừa TTL 1h từ JwtModule.register)
    const newPayload: JwtTokenPayload = { sub: user.id, email: user.email, role: user.role, tokenVersion: user.authTokenVersion };
    const access_token = this.signToken(newPayload);

    return { access_token };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    // Tách password ra để bảo mật, chỉ trả về thông tin cần thiết
    const { password, ...safeUserInfo } = user;
    return safeUserInfo;
  }

  // Thêm hàm Cập nhật Profile
  async updateProfile(userId: number, updateData: UpdateProfileDto) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found!');
      }

      // Validate số giấy tờ tuỳ thân theo loại (đồng bộ với frontend)
      if (updateData.identityNo) {
        const type = updateData.identityType ?? user.identityType ?? 'CCCD';
        const isValid =
          type === 'PASSPORT'
            ? /^[A-Za-z0-9]{6,15}$/.test(updateData.identityNo)
            : /^\d{12}$/.test(updateData.identityNo);
        if (!isValid) {
          throw new BadRequestException(
            type === 'PASSPORT'
              ? 'Số hộ chiếu không hợp lệ (6-15 ký tự chữ và số)'
              : 'Số CCCD phải gồm đúng 12 chữ số',
          );
        }
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(updateData.fullName && { fullName: updateData.fullName }),
          ...(updateData.phone !== undefined && { phone: updateData.phone }),
          ...(updateData.dob !== undefined && { dob: updateData.dob }),
          ...(updateData.gender !== undefined && { gender: updateData.gender }),
          ...(updateData.identityType !== undefined && { identityType: updateData.identityType }),
          ...(updateData.identityNo !== undefined && { identityNo: updateData.identityNo }),
        },
      });

      const { password, ...safeUserInfo } = updatedUser;
      return safeUserInfo;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể cập nhật thông tin cá nhân');
    }
  }

  // Thêm hàm Cập nhật Avatar
  async updateAvatar(userId: number, avatarUrl: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found!');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
      });

      const { password, ...safeUserInfo } = updatedUser;
      return safeUserInfo;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể cập nhật ảnh đại diện');
    }
  }

  // Thêm hàm Đổi mật khẩu
  async changePassword(userId: number, currentPass: string, newPass: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found!');
      }

      // Tài khoản Google không có password
      if (!user.password) {
        throw new UnauthorizedException(
          'Tài khoản này được tạo qua Google. Vui lòng dùng tính năng "Đặt mật khẩu" để thiết lập mật khẩu.',
        );
      }

      const isMatch = await bcrypt.compare(currentPass, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      const hashedPassword = await bcrypt.hash(newPass, 10);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          authTokenVersion: { increment: 1 },
          authRevokedAt: new Date(),
        },
      });

      return { message: 'Password updated successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể đổi mật khẩu');
    }
  }

  // =========================================================
  // SET PASSWORD: Cho Google users tạo mật khẩu lần đầu
  // (authProvider 'google' → 'both')
  // =========================================================
  async setPassword(userId: number, newPass: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found!');

      // Chỉ cho phép user chưa có password (pure Google user)
      if (user.password) {
        throw new UnauthorizedException(
          'Tài khoản đã có mật khẩu. Vui lòng dùng tính năng "Đổi mật khẩu".',
        );
      }

      const hashedPassword = await bcrypt.hash(newPass, 10);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          authProvider: 'both', // Giờ có cả Google lẫn email/password
        },
      });

      return { message: 'Password set successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Không thể thiết lập mật khẩu');
    }
  }

  // =========================================================
  // GOOGLE OAUTH: Tìm hoặc tạo user từ Google profile
  // Phương án A: Tự động liên kết nếu email đã tồn tại
  // =========================================================
  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }) {
    const { googleId, email, fullName, avatarUrl } = profile;

    // 1. Tìm bằng googleId (đã đăng nhập Google trước đó)
    const byGoogleId = await this.prisma.user.findUnique({ where: { googleId } });
    if (byGoogleId) {
      if (byGoogleId.deletedAt) {
        throw new UnauthorizedException('Your account has been deactivated. Please contact an administrator.');
      }
      return byGoogleId;
    }

    // 2. Tìm bằng email (đã có tài khoản local) → Phương án A: auto-link
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (byEmail.deletedAt) {
        throw new UnauthorizedException('Your account has been deactivated. Please contact an administrator.');
      }
      // Gán googleId và đánh dấu authProvider = "both"
      const updated = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId,
          authProvider: 'both',
          // Cập nhật avatar nếu user chưa có
          ...(avatarUrl && !byEmail.avatarUrl && { avatarUrl }),
        },
      });
      return updated;
    }

    // 3. Người dùng hoàn toàn mới → tạo tài khoản
    const newUser = await this.prisma.user.create({
      data: {
        email,
        fullName,
        password: null,
        googleId,
        authProvider: 'google',
        avatarUrl: avatarUrl ?? null,
        role: 'CUSTOMER',
      },
    });

    // Thông báo admin
    await this.adminNotifications.createSafe({
      type: 'customer_new',
      resourceType: 'User',
      resourceId: newUser.id,
      title: 'Khách hàng mới đăng ký (Google)',
      body: `${newUser.fullName} vừa tạo tài khoản qua Google.`,
      href: '/admin/customers',
      severity: 'info',
      targetRoles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
      metadata: { userId: newUser.id, email: newUser.email, provider: 'google' },
    });

    return newUser;
  }
}