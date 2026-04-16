import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import 'dotenv/config';

@Injectable()
export class PaymentService {
    private payos: PayOS;

    constructor(private readonly configService: ConfigService) {
        this.payos = new PayOS({
            clientId: process.env.PAYOS_CLIENT_ID,
            apiKey: process.env.PAYOS_API_KEY,
            checksumKey: process.env.PAYOS_CHECKSUM_KEY,
        });
    }

    /**
     * Tạo link thanh toán PayOS (VietQR)
     * @param orderCode - Mã đơn hàng (sử dụng Booking.id kiểu số nguyên)
     * @param amount - Số tiền VNĐ (kiểu số nguyên, không có phần thập phân)
     * @param description - Mô tả đơn hàng (tối đa 25 ký tự hiển thị trên mã QR ngân hàng)
     */
    async createPaymentLink(orderCode: number, amount: number, description: string): Promise<string> {
        const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000');

        const paymentLink = await this.payos.paymentRequests.create({
            orderCode,
            amount,
            description: description.substring(0, 25), // PayOS giới hạn 25 ký tự
            returnUrl: `${backendUrl}/booking/payos-return`,
            cancelUrl: `${backendUrl}/booking/payos-return`,
        });

        return paymentLink.checkoutUrl;
    }

    /**
     * Gọi PayOS API để lấy trạng thái thực tế của đơn hàng (PAID / CANCELLED / PENDING)
     */
    async getPaymentInfo(orderCode: number) {
        return this.payos.paymentRequests.get(orderCode);
    }

    /**
     * Xác thực dữ liệu Webhook từ server PayOS gửi về
     */
    async verifyWebhook(webhookBody: any) {
        return this.payos.webhooks.verify(webhookBody);
    }
}