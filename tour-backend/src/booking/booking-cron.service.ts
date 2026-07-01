import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingService } from './booking.service';

type CronErrorShape = {
    code?: unknown;
    status?: unknown;
    message?: unknown;
};

function isCronErrorShape(error: unknown): error is CronErrorShape {
    return typeof error === 'object' && error !== null;
}

function stringifyErrorField(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return undefined;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (typeof error === 'number' || typeof error === 'boolean') return String(error);
    try {
        return JSON.stringify(error);
    } catch {
        return 'Unknown error';
    }
}

@Injectable()
export class BookingCronService {
    private readonly logger = new Logger(BookingCronService.name);

    constructor(private readonly bookingService: BookingService) {}

    // ════════════════════════════════════════════════════════════════════════════
    // [CRON - DỌN ĐƠN QUÁ HẠN] @Cron mỗi 5 phút — NestJS Schedule tự gọi, không cần trigger thủ công.
    // → gọi bookingService.cancelExpiredBookings() → hủy đơn + hoàn ghế → bust Next.js cache.
    // ════════════════════════════════════════════════════════════════════════════
    /**
     * Chạy mỗi 5 phút.
     * Quét tất cả booking PENDING + UNPAID đã tạo quá 15 phút → Tự hủy + hoàn trả ghế.
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleExpiredBookings() {
        const jobName = 'cancel_expired_bookings';
        this.logger.log(`[CRON] Start job=${jobName}`);
        try {
            const result = await this.bookingService.cancelExpiredBookings();
            this.logger.log(
                `[CRON] Success job=${jobName} batchSize=${result.batchSize} processedCount=${result.processedCount}`,
            );
        } catch (error: unknown) {
            const code = isCronErrorShape(error)
                ? stringifyErrorField(error.code) ?? stringifyErrorField(error.status) ?? 'unknown'
                : 'unknown';
            const message = isCronErrorShape(error)
                ? stringifyErrorField(error.message) ?? getErrorMessage(error)
                : getErrorMessage(error);
            this.logger.error(`[CRON] Failed job=${jobName} code=${code} message=${message}`);
        }
    }

    /**
     * Chạy mỗi ngày lúc 8h sáng.
     * Nhắc bổ sung thông tin hành khách cho các đơn đã thanh toán sắp khởi hành mà còn thiếu.
     */
    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async handlePassengerInfoReminders() {
        const jobName = 'passenger_info_reminders';
        this.logger.log(`[CRON] Start job=${jobName}`);
        try {
            const result = await this.bookingService.sendPassengerInfoReminders();
            this.logger.log(
                `[CRON] Success job=${jobName} batchSize=${result.batchSize} sentCount=${result.sentCount} notifiedCount=${result.notifiedCount}`,
            );
        } catch (error: unknown) {
            const code = isCronErrorShape(error)
                ? stringifyErrorField(error.code) ?? stringifyErrorField(error.status) ?? 'unknown'
                : 'unknown';
            const message = isCronErrorShape(error)
                ? stringifyErrorField(error.message) ?? getErrorMessage(error)
                : getErrorMessage(error);
            this.logger.error(`[CRON] Failed job=${jobName} code=${code} message=${message}`);
        }
    }
}
