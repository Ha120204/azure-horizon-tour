import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import 'dotenv/config';

export type PaymentLinkResult = {
  orderCode: number;
  amount: number;
  description: string;
  checkoutUrl: string;
  paymentLinkId?: string;
  qrCode?: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
};

@Injectable()
export class PaymentService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentService.name);
  private payos: PayOS;

  constructor(private readonly configService: ConfigService) {
    this.payos = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }

  onApplicationBootstrap() {
    const backendUrl = this.configService.get<string>('BACKEND_URL', '');
    if (!backendUrl || backendUrl.includes('localhost')) {
      this.logger.warn('[PAYOS] BACKEND_URL is localhost — skipping webhook registration (PayOS cannot reach localhost)');
      return;
    }
    const webhookUrl = `${backendUrl}/booking/payos-webhook`;
    // PayOS gọi thử webhook URL ngay khi confirm — phải đợi HTTP server listen xong,
    // vì onApplicationBootstrap chạy TRƯỚC app.listen(). Trễ ~5s để chắc chắn app.listen()
    // đã hoàn tất trước khi PayOS gọi thử (không có hook "đã listen" nên dùng mốc thời gian).
    setTimeout(() => {
      this.payos.webhooks
        .confirm(webhookUrl)
        .then(() => this.logger.log(`[PAYOS] Webhook auto-registered: ${webhookUrl}`))
        .catch((err: unknown) =>
          this.logger.warn(`[PAYOS] Auto-register webhook failed — register manually at merchant.payos.vn: ${err instanceof Error ? err.message : String(err)}`),
        );
    }, 5000);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // [PAYOS - TẠO LINK THANH TOÁN] 2 ràng buộc bắt buộc của PayOS API:
  //   • amount phải là số nguyên VND (Math.round ở booking.service) — PayOS từ chối số lẻ.
  //   • description ≤ 25 ký tự — cắt substring(0,25) trước khi gọi.
  // returnUrl + cancelUrl đều về /booking/payos-return (backend xử lý → redirect FE).
  // Phản hồi có qrCode (chế độ QR nhúng) hoặc checkoutUrl (nhánh redirect PayOS).
  // ════════════════════════════════════════════════════════════════════════════
  async createPaymentRequest(orderCode: number, amount: number, description: string): Promise<PaymentLinkResult> {
    const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000');
    // PayOS giới hạn trường description tối đa 25 ký tự — cắt để tránh lỗi API.
    const normalizedDescription = description.substring(0, 25);

    const paymentLink = (await this.payos.paymentRequests.create({
      orderCode,
      amount,
      description: normalizedDescription,
      returnUrl: `${backendUrl}/booking/payos-return`,
      cancelUrl: `${backendUrl}/booking/payos-return`,
    })) as { checkoutUrl: string; id?: string; qrCode?: string; accountNumber?: string; accountName?: string; bin?: string };

    return {
      orderCode,
      amount,
      description: normalizedDescription,
      checkoutUrl: paymentLink.checkoutUrl,
      paymentLinkId: paymentLink.id,
      qrCode: paymentLink.qrCode,
      accountNumber: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      bin: paymentLink.bin,
    };
  }

  async createPaymentLink(orderCode: number, amount: number, description: string): Promise<string> {
    const paymentLink = await this.createPaymentRequest(orderCode, amount, description);
    return paymentLink.checkoutUrl;
  }

  async getPaymentInfo(orderCode: number) {
    return this.payos.paymentRequests.get(orderCode);
  }

  async cancelPaymentLink(orderCode: number, cancellationReason?: string) {
    return this.payos.paymentRequests.cancel(orderCode, cancellationReason);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // [PAYOS - KIỂM DẤU HMAC / CHỐNG WEBHOOK GIẢ] SDK tính lại chữ ký từ
  // (nội dung gói tin + PAYOS_CHECKSUM_KEY) rồi so với dấu PayOS gửi kèm.
  // Khớp → đúng là PayOS gửi → tin. Lệch → giả mạo/bị sửa → ném lỗi → bỏ qua.
  // Kẻ gian không có checksumKey → không tạo được dấu hợp lệ → không qua được bước này.
  // ════════════════════════════════════════════════════════════════════════════
  async verifyWebhook(webhookBody: Parameters<PayOS['webhooks']['verify']>[0]) {
    return this.payos.webhooks.verify(webhookBody);
  }
}
