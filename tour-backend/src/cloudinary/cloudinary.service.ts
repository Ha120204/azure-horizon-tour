import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

const UPLOAD_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

@Injectable()
export class CloudinaryService {
  private doUpload(file: Express.Multer.File, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) reject(error);
          else resolve(result!);
        },
      );

      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  async uploadFile(file: Express.Multer.File, folder = 'azure-horizon'): Promise<UploadApiResponse> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), UPLOAD_TIMEOUT_MS),
      );

      try {
        return await Promise.race([this.doUpload(file, folder), timeout]);
      } catch (error) {
        const isTimeout = (error as Error).message?.toLowerCase().includes('timeout');
        if (isTimeout && attempt < MAX_ATTEMPTS) continue;
        throw new BadRequestException(
          isTimeout
            ? 'Tải ảnh lên thất bại: Hết thời gian kết nối. Vui lòng thử lại.'
            : 'Tải ảnh lên thất bại. Vui lòng thử lại.',
        );
      }
    }
    throw new BadRequestException('Tải ảnh lên thất bại. Vui lòng thử lại.');
  }

  async uploadFiles(files: Express.Multer.File[], folder = 'azure-horizon'): Promise<string[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file, folder).then((result) => result.secure_url),
    );
    return Promise.all(uploadPromises);
  }
}
