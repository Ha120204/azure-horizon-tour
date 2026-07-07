import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { escapeHtml } from './templates/mail-utils';
import { buildMarketingCampaignTestHtml } from './templates/marketing-campaign-test.template';
import { buildMarketingCampaignHtml } from './templates/marketing-campaign.template';
import { buildPasswordResetHtml } from './templates/password-reset.template';
import { buildWelcomeHtml } from './templates/welcome.template';
import { buildBookingConfirmationHtml } from './templates/booking-confirmation.template';
import { buildPaymentRequestHtml } from './templates/payment-request.template';
import { buildPassengerReminderHtml } from './templates/passenger-reminder.template';
import { buildCancelRequestHtml } from './templates/cancel-request.template';
import { buildCancellationApprovedHtml } from './templates/cancellation-approved.template';
import { buildRefundCompletedHtml } from './templates/refund-completed.template';
import { buildTransportAssignedHtml } from './templates/transport-assigned.template';
import { buildSupportReplyHtml } from './templates/support-reply.template';
import { buildCancellationRejectedHtml } from './templates/cancellation-rejected.template';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown mail error';
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (!user || !pass) {
      throw new Error('MAIL_USER and MAIL_PASS are required in .env file!');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  async sendMail(options: nodemailer.SendMailOptions): Promise<unknown> {
    const info: unknown = await this.transporter.sendMail(options);
    return info;
  }

  async sendMarketingCampaignTest(data: {
    to: string;
    subject: string;
    previewText?: string;
    body: string;
    campaignName?: string;
  }) {
    const html = buildMarketingCampaignTestHtml({
      safeSubject: escapeHtml(data.subject),
      safePreview: escapeHtml(data.previewText ?? ''),
      safeBody: escapeHtml(data.body).replace(/\n/g, '<br/>'),
      safeCampaignName: escapeHtml(data.campaignName || 'Chiến dịch tiếp thị'),
    });
    return this.sendMail({
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `[GỬI THỬ] ${data.subject}`,
      html,
    });
  }

  async sendMarketingCampaignEmail(data: {
    to: string;
    subject: string;
    previewText?: string;
    body: string;
    campaignName?: string;
    unsubscribeToken: string;
  }) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const unsubscribeUrl = `${frontendUrl.replace(/\/$/, '')}/vi/unsubscribe?token=${encodeURIComponent(data.unsubscribeToken)}`;
    const html = buildMarketingCampaignHtml({
      safeSubject: escapeHtml(data.subject),
      safePreview: escapeHtml(data.previewText ?? ''),
      safeBody: escapeHtml(data.body).replace(/\n/g, '<br/>'),
      safeCampaignName: escapeHtml(data.campaignName || 'Bản tin Azure Horizon'),
      safeUnsubscribeUrl: escapeHtml(unsubscribeUrl),
      rawUnsubscribeUrl: unsubscribeUrl,
    });
    return this.sendMail({
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: data.subject,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
      html,
    });
  }

  async sendPasswordResetEmail(to: string, otp: string, fullName: string, locale: 'vi' | 'en' = 'vi') {
    const isVi = locale === 'vi';
    const subject = isVi
      ? 'Mã xác nhận đặt lại mật khẩu - Azure Horizon'
      : 'Your Password Reset Code - Azure Horizon';
    const html = buildPasswordResetHtml({
      greeting: isVi ? `Xin chào <strong>${fullName}</strong>,` : `Hello <strong>${fullName}</strong>,`,
      bodyText: isVi
        ? 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>Azure Horizon</strong> của bạn.<br/>Vui lòng sử dụng mã xác nhận bên dưới để hoàn tất quá trình:'
        : 'We received a request to reset the password for your <strong>Azure Horizon</strong> account.<br/>Please use the verification code below to complete the process:',
      codeLabel: isVi ? 'MÃ XÁC NHẬN' : 'VERIFICATION CODE',
      otp,
      expiryText: isVi
        ? 'Mã có hiệu lực trong <strong>10 phút</strong> kể từ khi nhận email này.'
        : 'This code is valid for <strong>10 minutes</strong> from when you received this email.',
      warningTitle: isVi ? '⚠ Lưu ý bảo mật' : '⚠ Security Notice',
      warningText: isVi
        ? 'Không chia sẻ mã này với bất kỳ ai. Azure Horizon sẽ không bao giờ hỏi mã OTP của bạn.<br/>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này — tài khoản của bạn vẫn an toàn.'
        : "Never share this code with anyone. Azure Horizon will never ask for your OTP.<br/>If you didn't request a password reset, you can safely ignore this email — your account is secure.",
    });
    try {
      const info: unknown = await this.transporter.sendMail({
        from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
        to,
        subject,
        html,
      });
      console.log('Password reset email sent successfully.');
      return info;
    } catch (error) {
      console.error('Error sending password reset email:', getErrorMessage(error));
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, fullName: string, password?: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to,
      subject: 'Welcome to Azure Horizon - Your Account Information',
      html: buildWelcomeHtml({ fullName, to, password, loginLink: `${frontendUrl}/vi/login` }),
    };
    try {
      const info: unknown = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully.');
      return info;
    } catch (error) {
      console.error('Error sending welcome email:', getErrorMessage(error));
      return null;
    }
  }

  async sendBookingConfirmation(data: {
    to: string;
    customerName: string;
    bookingCode: string;
    tourName: string;
    startDate: string;
    duration: string;
    numberOfPeople: number;
    totalPrice: string;
    discountAmount?: string;
  }) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `✈️ Booking Confirmed — ${data.bookingCode} | Azure Horizon`,
      html: buildBookingConfirmationHtml({ ...data, frontendUrl }),
    };
    try {
      const info: unknown = await this.transporter.sendMail(mailOptions);
      console.log('Booking confirmation email sent successfully.');
      return info;
    } catch (error) {
      console.error('Error sending booking confirmation:', getErrorMessage(error));
    }
  }

  async sendPaymentRequestEmail(data: {
    to: string;
    customerName: string;
    bookingCode: string;
    tourName: string;
    startDate: string;
    duration: string;
    passengerBreakdown: string;
    totalPrice: string;
    discountAmount?: string;
    paymentUrl: string;
    // Chuỗi VietQR thô từ PayOS (không phải URL). Quét ra chuyển khoản điền sẵn.
    qrCodeData?: string;
    deadlineText: string;
  }) {
    // Email tĩnh không chạy JS được, nên sinh ảnh QR qua dịch vụ ảnh QR:
    // ưu tiên chuỗi VietQR (khách quét ra chuyển khoản thật), fallback là link thanh toán.
    const qrSource = data.qrCodeData || data.paymentUrl;
    const qrMarkup = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrSource)}" alt="QR thanh toan" width="180" height="180" style="display:block;border-radius:12px;" />`;

    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `Xác nhận thông tin đặt tour và thanh toán - ${data.bookingCode}`,
      html: buildPaymentRequestHtml({ ...data, qrMarkup }),
    };
    const info: unknown = await this.transporter.sendMail(mailOptions);
    return info;
  }

  async sendPassengerInfoReminder(data: {
    to: string;
    customerName: string;
    bookingCode: string;
    tourName: string;
    startDate: string;
    incompleteCount: number;
    deadlineText: string;
    bookingUrl: string;
  }) {
    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `Vui long bo sung thong tin hanh khach - ${data.bookingCode}`,
      html: buildPassengerReminderHtml(data),
    };
    const info: unknown = await this.transporter.sendMail(mailOptions);
    return info;
  }

  async sendCancelRequestConfirmation(data: {
    to: string;
    customerName: string;
    bookingCode: string;
    tourName: string;
    cancelReason: string;
    refundAmount: number;
    refundNote: string;
  }) {
    const formattedRefund = data.refundAmount > 0
      ? data.refundAmount.toLocaleString('vi-VN') + 'đ'
      : 'Không hoàn tiền (theo chính sách hủy tour)';
    try {
      await this.transporter.sendMail({
        from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
        to: data.to,
        subject: `⏳ Yêu Cầu Hủy Tour Đã Được Ghi Nhận — ${data.bookingCode}`,
        html: buildCancelRequestHtml({ ...data, formattedRefund }),
      });
      console.log('Cancel request email sent successfully.');
    } catch (error) {
      console.error('Error sending cancel request email:', getErrorMessage(error));
    }
  }

  async sendCancellationApproved(data: {
    to: string;
    customerName: string;
    bookingCode: string;
    tourName: string;
    refundAmount: number;
    adminNote?: string;
  }) {
    const formattedRefund = data.refundAmount > 0
      ? data.refundAmount.toLocaleString('vi-VN') + 'đ'
      : 'Không hoàn tiền (theo chính sách hủy tour)';
    try {
      await this.transporter.sendMail({
        from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
        to: data.to,
        subject: `✅ Yêu Cầu Hủy Tour Được Chấp Thuận — ${data.bookingCode}`,
        html: buildCancellationApprovedHtml({ ...data, formattedRefund }),
      });
      console.log('Cancellation approved email sent successfully.');
    } catch (error) {
      console.error('Error sending cancellation approved email:', getErrorMessage(error));
    }
  }

  async sendRefundCompleted(data: {
    to: string;
    customerName: string;
    bookingCode: string;
    tourName: string;
    refundAmount: number;
    note?: string;
  }) {
    const formattedRefund = data.refundAmount.toLocaleString('vi-VN') + 'đ';
    try {
      await this.transporter.sendMail({
        from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
        to: data.to,
        subject: `💳 Đã Hoàn Tiền — ${data.bookingCode}`,
        html: buildRefundCompletedHtml({ ...data, formattedRefund }),
      });
      console.log('Refund completed email sent successfully.');
    } catch (error) {
      console.error('Error sending refund completed email:', getErrorMessage(error));
    }
  }

  async sendTransportAssignedEmail(data: {
    to: string;
    customerName: string;
    bookingCode: string;
    tourName: string;
    outboundTicketCodes: string[];
    outboundSeatNumbers: string[];
    outboundPnrCode?: string | null;
    returnTicketCodes: string[];
    returnSeatNumbers: string[];
    returnPnrCode?: string | null;
    vehiclePlate?: string | null;
    seatNumbers: string[];
    notes?: string | null;
  }) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    try {
      await this.transporter.sendMail({
        from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
        to: data.to,
        subject: `🎫 Thông Tin Vé Của Bạn — ${data.bookingCode} | Azure Horizon`,
        html: buildTransportAssignedHtml({ ...data, frontendUrl }),
      });
    } catch (error) {
      console.error('Error sending transport assigned email:', getErrorMessage(error));
    }
  }

  async sendSupportStaffReplyEmail(data: {
    to: string;
    customerName: string;
    ticketId: number;
    subject: string;
    replyContent: string;
    staffName: string;
    accessCode?: string;
  }) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const trackUrl = data.accessCode
      ? `${frontendUrl}/contact?ticketId=${data.ticketId}&accessCode=${encodeURIComponent(data.accessCode)}`
      : `${frontendUrl}/contact?ticketId=${data.ticketId}`;
    try {
      await this.sendMail({
        from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
        to: data.to,
        subject: `[Yêu cầu #${data.ticketId}] Nhân viên đã phản hồi yêu cầu của bạn`,
        html: buildSupportReplyHtml({
          safeCustomerName: escapeHtml(data.customerName),
          ticketId: data.ticketId,
          safeSubject: escapeHtml(data.subject),
          safeReply: escapeHtml(data.replyContent).replace(/\n/g, '<br/>'),
          safeStaffName: escapeHtml(data.staffName),
          safeTrackUrl: escapeHtml(trackUrl),
        }),
      });
    } catch (error) {
      console.error('Error sending support reply email:', getErrorMessage(error));
    }
  }

  async sendCancellationRejected(data: {
    to: string;
    customerName: string;
    bookingCode: string;
    tourName: string;
    rejectReason: string;
  }) {
    try {
      await this.transporter.sendMail({
        from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
        to: data.to,
        subject: `❌ Yêu Cầu Hủy Tour Bị Từ Chối — ${data.bookingCode}`,
        html: buildCancellationRejectedHtml(data),
      });
      console.log('Cancellation rejected email sent successfully.');
    } catch (error) {
      console.error('Error sending cancellation rejected email:', getErrorMessage(error));
    }
  }
}
