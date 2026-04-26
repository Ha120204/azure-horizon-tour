import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { SendContactDto } from './dto/create-contact.dto';

const SUBJECT_LABELS: Record<string, string> = {
  booking: 'Hỗ trợ đặt tour / Booking Assistance',
  payment: 'Vấn đề thanh toán / Payment Issue',
  cancellation: 'Hủy / Đổi lịch / Cancellation & Reschedule',
  complaint: 'Khiếu nại dịch vụ / Service Complaint',
  partnership: 'Hợp tác kinh doanh / Business Partnership',
  general: 'Câu hỏi chung / General Question',
};

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async sendContactEmail(dto: SendContactDto): Promise<{ message: string }> {
    const adminEmail = this.configService.get<string>('MAIL_USER');
    const subjectLabel = SUBJECT_LABELS[dto.subject] ?? dto.subject;
    const fullPhone = `${dto.phonePrefix} ${dto.phone}`;

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#003f87,#0066cc);padding:36px 32px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">Azure Horizon</h1>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Tin nhắn liên hệ mới</p>
        </div>

        <div style="padding:36px 32px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;width:140px;vertical-align:top;">Họ và tên</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;font-weight:600;">${dto.name}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">Email</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;"><a href="mailto:${dto.email}" style="color:#003f87;">${dto.email}</a></td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">Số điện thoại</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;">${fullPhone}</td>
            </tr>
            ${dto.reference ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">Mã đặt chỗ</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;font-family:'Courier New',monospace;font-weight:700;">${dto.reference}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">Chủ đề</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#003f87;font-size:14px;font-weight:600;">${subjectLabel}</td>
            </tr>
            ${dto.attachmentName ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">File đính kèm</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;">📎 ${dto.attachmentName}</td>
            </tr>` : ''}
          </table>

          <div style="background:#f8fafc;border-left:4px solid #003f87;border-radius:0 8px 8px 0;padding:20px 24px;margin-top:8px;">
            <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;font-weight:600;">Nội dung tin nhắn</p>
            <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;">${dto.message}</p>
          </div>
        </div>

        <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">© 2026 Azure Horizon. Tin nhắn được gửi qua trang Contact.</p>
        </div>
      </div>
    `;

    // Gửi đến admin
    await this.mailService['transporter'].sendMail({
      from: `"Azure Horizon Contact" <${adminEmail}>`,
      to: adminEmail,
      replyTo: dto.email,
      subject: `[Contact] ${subjectLabel} — ${dto.name}`,
      html,
    });

    // Gửi email xác nhận đến người liên hệ
    await this.mailService['transporter'].sendMail({
      from: `"Azure Horizon" <${adminEmail}>`,
      to: dto.email,
      subject: 'Chúng tôi đã nhận được tin nhắn của bạn — Azure Horizon',
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#003f87,#0066cc);padding:40px 30px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:26px;font-weight:700;">Azure Horizon</h1>
          </div>
          <div style="padding:36px 30px;">
            <h2 style="color:#1a1a2e;margin:0 0 12px;font-size:20px;">Cảm ơn bạn, ${dto.name}!</h2>
            <p style="color:#64748b;line-height:1.7;margin:0 0 20px;">Chúng tôi đã nhận được tin nhắn của bạn liên quan đến <strong>${subjectLabel}</strong>. Đội ngũ concierge sẽ phản hồi trong vòng <strong>2 giờ làm việc</strong>.</p>
            <div style="background:#f0f6ff;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
              <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Nội dung bạn đã gửi:</p>
              <p style="color:#1e293b;margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${dto.message}</p>
            </div>
            <p style="color:#94a3b8;font-size:13px;">Nếu cần hỗ trợ khẩn cấp, liên hệ: <strong>support@azurehorizon.com</strong></p>
          </div>
          <div style="background:#f1f5f9;padding:20px 30px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 Azure Horizon. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    this.logger.log(`✅ Contact email sent: ${dto.name} <${dto.email}>`);
    return { message: 'Message sent successfully' };
  }
}
