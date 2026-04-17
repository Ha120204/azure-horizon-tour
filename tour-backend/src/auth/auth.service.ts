import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) { }

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
    return result;
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password, ...result } = user;

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    // Refresh token — payload tối giản, sống 7 ngày
    const refresh_token = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '7d' },
    );

    return { user: result, access_token, refresh_token };
  }

  async forgotPassword(email: string) {
    // 1. Kiểm tra xem email này có tồn tại trong database (bảng User) không
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    // 2. Tạo ra một Token đặc biệt (dùng JWT hoặc mã random)
    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    );

    // 3. Gửi email chứa token đó
    let emailSent = false;
    try {
      await this.mailService.sendPasswordResetEmail(email, resetToken);
      emailSent = true;
    } catch (error) {
      console.warn('⚠️ Could not send email (Resend free tier?):', error.message);
      console.warn('📧 Reset link for dev testing: http://localhost:3001/reset-password?token=' + resetToken);
    }

    return {
      message: emailSent
        ? 'Password reset link sent to email'
        : 'Email could not be sent (dev mode). Check server console for reset link.',
      resetLink: !emailSent
        ? `http://localhost:3001/reset-password?token=${resetToken}`
        : undefined,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // 1. Verify the JWT token
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token. Please request a new password reset link.');
    }

    // 2. Find the user by ID from the token payload
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 3. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update the password in the database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { message: 'Password has been reset successfully' };
  }

  // =========================================================
  // REFRESH TOKEN: Cấp access_token mới khi token cũ hết hạn
  // =========================================================
  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token. Please log in again.');
    }

    // Truy vấn DB lấy thông tin user mới nhất (đề phòng role đã thay đổi)
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    // Sinh access_token mới (kế thừa TTL 1h từ JwtModule.register)
    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(newPayload);

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
  async updateProfile(userId: number, updateData: { fullName?: string, phone?: string, dob?: string, gender?: string }) {
    // 1. Tìm user trong Database
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    // 2. Cập nhật thông tin bằng Prisma
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateData.fullName && { fullName: updateData.fullName }),
        ...(updateData.phone !== undefined && { phone: updateData.phone }),
        ...(updateData.dob !== undefined && { dob: updateData.dob }),
        ...(updateData.gender !== undefined && { gender: updateData.gender })
      },
    });

    // 3. Trả về thông tin mới (nhớ bỏ password)
    const { password, ...safeUserInfo } = updatedUser;
    return safeUserInfo;
  }

  // Thêm hàm Cập nhật Avatar
  async updateAvatar(userId: number, avatarUrl: string) {
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
  }

  // Thêm hàm Đổi mật khẩu
  async changePassword(userId: number, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found!');
    }

    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }
}
