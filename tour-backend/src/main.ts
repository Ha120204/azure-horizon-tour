import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

// [PHASE 1] Best Practices imports
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.enableCors({
    origin: 'http://localhost:3001',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // [PHASE 1] Đăng ký Global Pipes, Interceptors, Filters
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Tự động loại bỏ các field không có trong DTO
    forbidNonWhitelisted: true, // Trả lỗi nếu gửi field lạ
    transform: true,            // Tự động transform kiểu dữ liệu (string → number, etc.)
  }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new PrismaExceptionFilter());

  app.useStaticAssets(join(process.cwd(), 'public'));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

