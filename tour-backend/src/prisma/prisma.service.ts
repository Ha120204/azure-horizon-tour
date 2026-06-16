// Nạp các biến môi trường từ file .env vào đối tượng process.env
import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
// Import module Pool từ thư viện 'pg' để quản lý kết nối PostgreSQL
import { Pool } from 'pg';
// Import adapter của Prisma dành riêng cho thư viện 'pg'
import { PrismaPg } from '@prisma/adapter-pg';

// @Injectable() đánh dấu class này là một Provider trong NestJS, 
// cho phép nó được inject (tiêm) vào các Controller hoặc Service khác thông qua Dependency Injection.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly pool: Pool;

    constructor() {
        // Bắt buộc cấu hình qua biến môi trường — không hardcode credential vào source.
        // Fail-fast nếu thiếu để tránh chạy nhầm vào DB sai (đặc biệt ở production).
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL chưa được cấu hình. Vui lòng thiết lập trong file .env.');
        }

        // Khởi tạo một Connection Pool (hồ chứa kết nối) bằng thư viện 'pg'.
        // Việc dùng Pool giúp ứng dụng tái sử dụng các kết nối DB, tăng hiệu suất và tránh quá tải.
        const pool = new Pool({ connectionString });

        // Khởi tạo adapter kết nối của Prisma, kết nối nó với pool vừa tạo ở trên.
        // (Ép kiểu 'as any' để tránh lỗi TypeScript mismatch giữa các phiên bản type của pg và prisma).
        const adapter = new PrismaPg(pool as any);

        // Gọi constructor của class cha (PrismaClient) và truyền cấu hình adapter vào 
        // để Prisma biết cách giao tiếp với database thông qua thư viện 'pg'.
        super({ adapter });
        this.pool = pool;
    }

    // Đây là một lifecycle hook của NestJS. 
    // Hàm này sẽ tự động được chạy một lần duy nhất khi module chứa PrismaService khởi tạo xong.
    async onModuleInit() {
        // Chủ động thiết lập kết nối tới database ngay khi app vừa khởi động.
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
        await this.pool.end();
    }
}
