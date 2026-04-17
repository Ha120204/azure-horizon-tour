import { Controller, Post, Body, Get, UseGuards, Request, Patch, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.fullName,
    );
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(
      loginDto.email,
      loginDto.password,
    );
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
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refreshToken(body.refresh_token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req) {
    const userId = req.user.userId;
    return this.authService.getProfile(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() body: { fullName?: string, phone?: string, dob?: string, gender?: string }
  ) {
    const userId = req.user.userId;
    return this.authService.updateProfile(userId, body);
  }

  // =========================================================
  // [THÊM MỚI]: API XỬ LÝ UPLOAD ẢNH ĐẠI DIỆN
  // =========================================================
  @UseGuards(AuthGuard('jwt'))
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      // Nơi lưu ảnh (Nhớ tạo thư mục public/uploads/avatars ở Backend nhé)
      destination: './public/uploads/avatars',
      filename: (req, file, cb) => {
        // Đổi tên ảnh để không bị trùng (vd: avatar-123456789.jpg)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      // Chặn các file không phải là ảnh
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('Please select an image');
    }

    const userId = req.user.userId;

    // Tạo link ảnh trả về cho Frontend hiển thị
    const avatarUrl = `http://localhost:3000/uploads/avatars/${file.filename}`;

    // LƯU Ý: Em có thể vào file auth.service.ts viết thêm cái hàm updateAvatar 
    // để lưu cái avatarUrl này vào Database của user đó nhé!
    await this.authService.updateAvatar(userId, avatarUrl);

    return {
      message: 'Avatar uploaded successfully',
      data: { avatarUrl }
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    const userId = req.user.userId;
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
  }
}