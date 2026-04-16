import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingService } from './booking.service';

@Injectable()
export class BookingCronService {
    constructor(private readonly bookingService: BookingService) { }

    /**
     * Chạy mỗi 5 phút.
     * Quét tất cả booking PENDING + UNPAID đã tạo quá 15 phút → Tự hủy + hoàn trả ghế.
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleExpiredBookings() {
        console.log('[CRON] Bắt đầu quét đơn hàng quá hạn...');
        await this.bookingService.cancelExpiredBookings();
    }
}
