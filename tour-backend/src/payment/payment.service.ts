import { Injectable } from '@nestjs/common';
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
export class PaymentService {
  private payos: PayOS;

  constructor(private readonly configService: ConfigService) {
    this.payos = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
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
