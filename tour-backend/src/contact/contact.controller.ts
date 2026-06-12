import {
  Controller,
  Post,
  Body,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { SendContactDto } from './dto/create-contact.dto';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

type AuthenticatedRequest = {
  user?: { id?: number | string; userId?: number | string; sub?: number | string };
};

const getAuthUserId = (req: AuthenticatedRequest): number | undefined => {
  const value = req.user?.userId ?? req.user?.sub ?? req.user?.id;
  if (value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * POST /contact/send
   * Nhận form data (multipart) — có thể kèm file đính kèm (tùy chọn)
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Chống spam: tối đa 5 lần/phút
  @UseGuards(OptionalJwtGuard) // Có token → req.user populate; khách vãng lai vẫn gửi được
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('attachment', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only PDF, JPG, PNG files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async sendContact(
    @Body() dto: SendContactDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.attachmentName = file.originalname;
    }
    // userId chỉ tin từ JWT, không nhận từ body để tránh gắn ticket vào tài khoản khác
    return this.contactService.sendContactEmail(dto, getAuthUserId(req), file);
  }
}
