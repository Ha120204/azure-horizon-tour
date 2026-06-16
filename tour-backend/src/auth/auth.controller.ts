import { Controller, Post, Body, Get, UseGuards, Request, Patch, UseInterceptors, UploadedFile, BadRequestException, Res, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response, Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';

type JwtRequestUser = {
  userId: number;
  id?: number;
  role?: string;
  email?: string;
};

type AuthenticatedRequest = ExpressRequest & {
  user: JwtRequestUser;
};

// Production: FE (Vercel) và BE (Render) khác domain → cookie phải là
// sameSite:'none' + secure:true thì trình duyệt mới gửi kèm fetch cross-site.
// Dev (http localhost): 'none' bị từ chối khi không secure nên dùng 'lax'.
const isProd = process.env.NODE_ENV === 'production';
const COOKIE_SAME_SITE: CookieOptions['sameSite'] = isProd ? 'none' : 'lax';

function authCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    maxAge,
  };
}

function clearAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.fullName,
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response, @Req() req: ExpressRequest) {
    const data = await this.authService.login(
      loginDto.email,
      loginDto.password,
      {
        ipAddress: req.ip || (req.socket.remoteAddress ?? undefined),
        userAgent: req.headers['user-agent'],
      },
    );

    res.cookie(ACCESS_TOKEN_COOKIE, data.access_token, authCookieOptions(60 * 60 * 1000));
    res.cookie(REFRESH_TOKEN_COOKIE, data.refresh_token, authCookieOptions(7 * 24 * 60 * 60 * 1000));

    return { user: data.user };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string; locale?: 'vi' | 'en' }) {
    return this.authService.forgotPassword(body.email, body.locale ?? 'vi');
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Partial<Record<string, string>> | undefined;
    const refreshToken = cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new BadRequestException('Refresh token missing from cookies');
    }
    const data = await this.authService.refreshToken(refreshToken);
    res.cookie(ACCESS_TOKEN_COOKIE, data.access_token, authCookieOptions(60 * 60 * 1000));
    return { message: 'Access token refreshed' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, clearAuthCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE, clearAuthCookieOptions());
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.authService.getProfile(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateProfileDto,
  ) {
    const userId = req.user.userId;
    return this.authService.updateProfile(userId, body);
  }

  // =========================================================
  // [AVATAR UPLOAD]: Dùng Cloudinary (nhất quán với Tour images)
  // =========================================================
  @UseGuards(AuthGuard('jwt'))
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req: AuthenticatedRequest) {
    if (!file) {
      throw new BadRequestException('Please select an image');
    }

    // Kiểm tra định dạng file trước khi upload
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      throw new BadRequestException('Only image files are allowed (jpg, jpeg, png, gif, webp)');
    }

    // Kiểm tra kích thước (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    const userId = req.user.userId;

    // Upload lên Cloudinary thay vì lưu local disk
    const result = await this.cloudinaryService.uploadFile(file, 'azure-horizon/avatars');
    const avatarUrl = result.secure_url;

    await this.authService.updateAvatar(userId, avatarUrl);

    return {
      message: 'Avatar uploaded successfully',
      data: { avatarUrl },
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.userId;
    const result = await this.authService.changePassword(userId, body.currentPassword, body.newPassword);
    res.clearCookie(ACCESS_TOKEN_COOKIE, clearAuthCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE, clearAuthCookieOptions());
    return result;
  }

  /**
   * POST /auth/set-password
   * Chỉ dành cho Google users (password = null) muốn thêm mật khẩu.
   * Sau khi đặt xong, authProvider trở thành 'both'.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('set-password')
  async setPassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: SetPasswordDto,
  ) {
    const userId = req.user.userId;
    return this.authService.setPassword(userId, body.newPassword);
  }


  // =========================================================
  // GOOGLE OAUTH 2.0
  // =========================================================

  /**
   * GET /auth/google
   * Redirect người dùng đến Google consent screen.
   * Passport xử lý tự động — không cần body.
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  /**
   * GET /auth/google/callback
   * Google redirect về đây sau khi user đồng ý.
   * Passport gọi GoogleStrategy.validate() → trả về user object.
   * Backend tạo JWT cookie → redirect về frontend.
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(
    @Req() req: ExpressRequest & { user: Record<string, unknown> },
    @Res() res: Response,
  ) {
    const user = req.user;

    const payload = {
      sub: user['id'] as number,
      email: user['email'] as string,
      role: user['role'] as string,
      tokenVersion: user['authTokenVersion'] as number,
    };

    const access_token = this.authService.signToken(payload);
    const refresh_token = this.authService.signRefreshToken({
      sub: payload.sub,
      tokenVersion: payload.tokenVersion,
    });

    res.cookie(ACCESS_TOKEN_COOKIE, access_token, authCookieOptions(60 * 60 * 1000));
    res.cookie(REFRESH_TOKEN_COOKIE, refresh_token, authCookieOptions(7 * 24 * 60 * 60 * 1000));

    void this.authService.createLoginLogSafe(
      user['id'] as number,
      user['fullName'] as string,
      user['role'] as string,
      { ipAddress: req.ip, userAgent: req.headers['user-agent'] as string },
    );

    // Redirect về trang callback của frontend kèm thông tin user
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const callbackUrl = new URL('/auth/callback', frontendUrl);
    callbackUrl.searchParams.set('name', (user['fullName'] as string) || '');
    if (user['avatarUrl']) {
      callbackUrl.searchParams.set('avatar', user['avatarUrl'] as string);
    }

    res.redirect(callbackUrl.toString());
  }
}
