import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, UseInterceptors, UploadedFile,
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
  Optional,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TourService } from './tour.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { FilterTourDto } from './dto/filter-tour.dto';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

@Controller('tour')
export class TourController {
  constructor(
    private readonly tourService: TourService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  /**
   * Tạo Tour mới.
   * - Nếu gửi JSON thuần với imageUrl string → hoạt động như cũ.
   * - Nếu gửi multipart/form-data kèm file ảnh (field 'image') → upload lên Cloudinary.
   * File được validate: tối đa 5MB, chỉ nhận .jpg/.jpeg/.png
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createTourDto: CreateTourDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
        fileIsRequired: false, // Cho phép không gửi file (dùng imageUrl string cũ)
      }),
    )
    file?: Express.Multer.File,
  ) {
    if (file) {
      const result = await this.cloudinaryService.uploadFile(file, 'azure-horizon/tours');
      createTourDto.imageUrl = result.secure_url;
    }
    return this.tourService.create(createTourDto);
  }

  @Get()
  findAll(@Query() query: FilterTourDto) {
    return this.tourService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tourService.findOne(+id);
  }

  /**
   * Cập nhật Tour.
   * Tương tự POST, hỗ trợ cả JSON thuần và multipart/form-data với file upload.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateTourDto: UpdateTourDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    if (file) {
      const result = await this.cloudinaryService.uploadFile(file, 'azure-horizon/tours');
      updateTourDto.imageUrl = result.secure_url;
    }
    return this.tourService.update(+id, updateTourDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tourService.remove(+id);
  }
}
