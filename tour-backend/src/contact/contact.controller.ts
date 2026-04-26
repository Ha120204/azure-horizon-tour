import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { SendContactDto } from './dto/create-contact.dto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * POST /contact/send
   * Nhận form data (multipart) — có thể kèm file đính kèm (tùy chọn)
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Chống spam: tối đa 5 lần/phút
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
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.attachmentName = file.originalname;
    }
    return this.contactService.sendContactEmail(dto);
  }
}
