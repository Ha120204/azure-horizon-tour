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

  async onApplicationBootstrap() {
    const backendUrl = this.configService.get<string>('BACKEND_URL', '');
    if (!backendUrl || backendUrl.includes('localhost')) {
      this.logger.warn('[PAYOS] BACKEND_URL is localhost — skipping webhook registration (PayOS cannot reach localhost)');
      return;
    }
    const webhookUrl = `${backendUrl}/booking/payos-webhook`;
    try {
      await this.payos.webhooks.confirm(webhookUrl);
      this.logger.log(`[PAYOS] Webhook auto-registered: ${webhookUrl}`);
    } catch (err) {
      // Nếu PayOS từ chối auto-register, đăng ký thủ công tại merchant.payos.vn
      this.logger.warn(`[PAYOS] Auto-register webhook failed — register manually at merchant.payos.vn: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async createPaymentRequest(orderCode: number, amount: number, description: string): Promise<PaymentLinkResult> {
    const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000');
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

  async verifyWebhook(webhookBody: Parameters<PayOS['webhooks']['verify']>[0]) {
    return this.payos.webhooks.verify(webhookBody);
  }
}
