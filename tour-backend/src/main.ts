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
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET chưa được cấu hình trong môi trường (.env). Dừng app để tránh ký/verify token bằng secret rỗng.',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.use(cookieParser());
  app.use(helmet({ crossOriginResourcePolicy: false }));
  const isDev = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3001',
        'http://localhost:3001',
      ];
      // Cho phép tất cả devtunnels.ms trong môi trường dev
      if (!origin || allowedOrigins.includes(origin) || (isDev && origin?.endsWith('.devtunnels.ms'))) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
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
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useStaticAssets(join(process.cwd(), 'public'));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();