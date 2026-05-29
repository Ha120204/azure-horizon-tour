import { Controller, Post, Body, Get, UseGuards, Request, Patch, UseInterceptors, UploadedFile, BadRequestException, Res, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response, Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

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

function authCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

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
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );

    res.cookie(ACCESS_TOKEN_COOKIE, data.access_token, authCookieOptions(60 * 60 * 1000));
    res.cookie(REFRESH_TOKEN_COOKIE, data.refresh_token, authCookieOptions(7 * 24 * 60 * 60 * 1000));

    return { user: data.user };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

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
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
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
    @Body() body: UpdateProfileDto
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

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: { currentPassword: string; newPassword: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.userId;
    const result = await this.authService.changePassword(userId, body.currentPassword, body.newPassword);
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
    return result;
  }
}
