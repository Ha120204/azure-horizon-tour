import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  /**
   * Upload một file ảnh lên Cloudinary.
   * @param file - Express.Multer.File (buffer từ memory storage)
   * @param folder - Tên folder trên Cloudinary (vd: 'tours', 'reviews')
   * @returns secure_url của ảnh đã upload
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'azure-horizon',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(new BadRequestException(`Cloudinary upload failed: ${error.message}`));
          } else {
            resolve(result!);
          }
        },
      );

      // Chuyển buffer thành readable stream và pipe vào cloudinary
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Upload nhiều file ảnh cùng lúc.
   * @param files - Mảng Express.Multer.File
   * @param folder - Tên folder trên Cloudinary
   * @returns Mảng secure_url
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'azure-horizon',
  ): Promise<string[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file, folder).then((result) => result.secure_url),
    );
    return Promise.all(uploadPromises);
  }
}
