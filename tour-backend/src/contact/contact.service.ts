import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { SendContactDto } from './dto/create-contact.dto';
import { SupportService } from '../support/support.service';
import { SettingsService } from '../settings/settings.service';

const SUBJECT_LABELS: Record<string, string> = {
  booking: 'Hỗ trợ đặt tour / Booking Assistance',
  payment: 'Vấn đề thanh toán / Payment Issue',
  cancellation: 'Hủy / Đổi lịch / Cancellation & Reschedule',
  complaint: 'Khiếu nại dịch vụ / Service Complaint',
  partnership: 'Hợp tác kinh doanh / Business Partnership',
  general: 'Câu hỏi chung / General Question',
};

const SUBJECTS_REQUIRING_REFERENCE = new Set([
  'payment',
  'cancellation',
  'complaint',
]);

type ContextRow = {
  label: string;
  value: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown support error';
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getContactMethodLabel(value?: string) {
  const labels: Record<string, string> = {
    zalo: 'Zalo',
    phone: 'Điện thoại / Phone',
    email: 'Email',
  };
  return value ? labels[value] ?? value : undefined;
}

function getPaymentMethodLabel(value?: string) {
  const labels: Record<string, string> = {
    bank_transfer: 'Chuyển khoản / Bank transfer',
    card: 'Thẻ ngân hàng / Card',
    wallet: 'Ví điện tử / E-wallet',
    cash: 'Thanh toán trực tiếp / Pay in person',
  };
  return value ? labels[value] ?? value : undefined;
}

function getPartnerTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    agency: 'Đại lý / Agency',
    supplier: 'Nhà cung cấp / Supplier',
    corporate: 'Khách đoàn/doanh nghiệp / Corporate group',
    other: 'Đối tác khác / Other partner',
  };
  return value ? labels[value] ?? value : undefined;
}

function buildContextRows(dto: SendContactDto): ContextRow[] {
  const rows: ContextRow[] = [];
  const push = (label: string, value?: string) => {
    const normalized = clean(value);
    if (normalized) rows.push({ label, value: normalized });
  };

  if (dto.subject === 'booking') {
    push('Tour/điểm đến quan tâm', dto.tourInterest);
    push('Ngày đi dự kiến', dto.preferredTravelDate);
    push('Số khách', dto.guestCount);
    push('Kênh liên hệ ưu tiên', getContactMethodLabel(dto.preferredContactMethod));
  } else if (dto.subject === 'payment') {
    push('Phương thức thanh toán', getPaymentMethodLabel(dto.paymentMethod));
  } else if (dto.subject === 'cancellation') {
    push('Ngày muốn đổi sang', dto.requestedChangeDate);
    push('Lý do đổi/hủy', dto.cancellationReason);
  } else if (dto.subject === 'complaint') {
    push('Thời điểm xảy ra sự cố', dto.issueOccurredAt);
  } else if (dto.subject === 'partnership') {
    push('Tên công ty/đơn vị', dto.companyName);
    push('Vai trò hợp tác', getPartnerTypeLabel(dto.partnerType));
    push('Website/kênh tham khảo', dto.website);
  }

  return rows;
}

function appendContextToMessage(message: string, rows: ContextRow[]) {
  if (rows.length === 0) return message;
  const details = rows.map((row) => `- ${row.label}: ${row.value}`).join('\n');
  return `${message.trim()}\n\n---\nThông tin bổ sung:\n${details}`;
}

function buildContextTableRows(rows: ContextRow[]) {
  if (rows.length === 0) return '';

  return rows
    .map(
      (row) => `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">${escapeHtml(row.label)}</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;font-weight:600;">${escapeHtml(row.value)}</td>
            </tr>`,
    )
    .join('');
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly supportService: SupportService,
    private readonly settingsService: SettingsService,
  ) {}

  async sendContactEmail(
    dto: SendContactDto,
    userId?: number,
    file?: Express.Multer.File,
  ): Promise<{ message: string; ticketId: number; accessCode?: string }> {
    const reference = dto.reference?.trim();
    if (SUBJECTS_REQUIRING_REFERENCE.has(dto.subject) && !reference) {
      throw new BadRequestException(
        'Booking reference is required for this request type',
      );
    }

    const adminEmail = this.configService.get<string>('MAIL_USER');
    const publicSettings = await this.settingsService.getPublic();
    const companyName = publicSettings.company_name || 'Azure Horizon';
    const supportEmail =
      publicSettings.company_email ||
      adminEmail ||
      'azurehorizon.tech@gmail.com';
    const supportPhone = publicSettings.company_phone || '0386761856';
    const mailSender = adminEmail ?? supportEmail;
    const subjectLabel = SUBJECT_LABELS[dto.subject] ?? dto.subject;
    const fullPhone = `${dto.phonePrefix} ${dto.phone}`;
    const contextRows = buildContextRows(dto);
    const contextTableRows = buildContextTableRows(contextRows);
    const ticketMessage = appendContextToMessage(dto.message, contextRows);
    const safeCompanyName = escapeHtml(companyName);
    const safeName = escapeHtml(dto.name);
    const safeEmail = escapeHtml(dto.email);
    const safeFullPhone = escapeHtml(fullPhone);
    const safeReference = reference ? escapeHtml(reference) : undefined;
    const safeSubjectLabel = escapeHtml(subjectLabel);
    const safeAttachmentName = dto.attachmentName
      ? escapeHtml(dto.attachmentName)
      : undefined;
    const safeSupportEmail = escapeHtml(supportEmail);
    const safeSupportPhone = escapeHtml(supportPhone);

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#003f87,#0066cc);padding:36px 32px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">${safeCompanyName}</h1>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Tin nhắn liên hệ mới</p>
        </div>

        <div style="padding:36px 32px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;width:140px;vertical-align:top;">Họ và tên</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;font-weight:600;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">Email</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;"><a href="mailto:${safeEmail}" style="color:#003f87;">${safeEmail}</a></td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">Số điện thoại</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;">${safeFullPhone}</td>
            </tr>
            ${
              reference
                ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">Mã đặt chỗ</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;font-family:'Courier New',monospace;font-weight:700;">${safeReference}</td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">Chủ đề</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#003f87;font-size:14px;font-weight:600;">${safeSubjectLabel}</td>
            </tr>
            ${contextTableRows}
            ${
              safeAttachmentName
                ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;vertical-align:top;">File đính kèm</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;">📎 ${safeAttachmentName}</td>
            </tr>`
                : ''
            }
          </table>

          <div style="background:#f8fafc;border-left:4px solid #003f87;border-radius:0 8px 8px 0;padding:20px 24px;margin-top:8px;">
            <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;font-weight:600;">Nội dung tin nhắn</p>
            <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;">${escapeHtml(dto.message)}</p>
          </div>
        </div>

        <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">© 2026 ${safeCompanyName}. Tin nhắn được gửi qua trang Contact.</p>
        </div>
      </div>
    `;

    // Gửi đến admin — đính kèm file thật của khách (nếu có)
    await this.mailService.sendMail({
      from: `"${companyName} Contact" <${mailSender}>`,
      to: adminEmail ?? supportEmail,
      replyTo: dto.email,
      subject: `[Contact] ${subjectLabel} — ${dto.name}`,
      html,
      attachments: file
        ? [{ filename: file.originalname, content: file.buffer }]
        : undefined,
    });

    this.logger.log('Contact email sent successfully.');

    // ── Lưu ticket vào DB để Staff theo dõi ──────────────────────────────────
    type TicketCat =
      | 'booking'
      | 'payment'
      | 'reschedule'
      | 'complaint'
      | 'general';
    const CATEGORY_MAP: Record<string, TicketCat> = {
      booking: 'booking',
      payment: 'payment',
      cancellation: 'reschedule',
      complaint: 'complaint',
      general: 'general',
      partnership: 'general',
    };

    let ticketId = 0;
    let accessCode: string | undefined;
    try {
      const ticket = await this.supportService.createFromContact({
        customerName: dto.name,
        customerEmail: dto.email,
        customerPhone: `${dto.phonePrefix} ${dto.phone}`.trim(),
        bookingRef: reference || undefined,
        subject: subjectLabel,
        message: ticketMessage,
        category: CATEGORY_MAP[dto.subject] ?? 'general',
        userId,
      });
      ticketId = ticket.id;
      accessCode = ticket.accessCode ?? undefined;
      this.logger.log(`Support ticket #${ticketId} created from contact form.`);

      // Gửi email xác nhận kèm mã yêu cầu để khách đối chiếu khi trao đổi với đội ngũ hỗ trợ.

      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:3001',
      );
      const ticketLookupUrl = accessCode
        ? `${frontendUrl}/contact?ticketId=${ticketId}&accessCode=${encodeURIComponent(accessCode)}`
        : undefined;
      const safeAccessCode = accessCode ? escapeHtml(accessCode) : undefined;
      const safeTicketLookupUrl = ticketLookupUrl
        ? escapeHtml(ticketLookupUrl)
        : undefined;

      await this.mailService.sendMail({
        from: `"${companyName}" <${mailSender}>`,
        to: dto.email,
        subject: `Chúng tôi đã nhận được tin nhắn của bạn — ${companyName}`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#003f87,#0066cc);padding:40px 30px;text-align:center;">
              <h1 style="color:white;margin:0;font-size:26px;font-weight:700;">${safeCompanyName}</h1>
            </div>
            <div style="padding:36px 30px;">
              <h2 style="color:#1a1a2e;margin:0 0 12px;font-size:20px;">Cảm ơn bạn, ${safeName}!</h2>
              <p style="color:#64748b;line-height:1.7;margin:0 0 20px;">
                Chúng tôi đã nhận được tin nhắn của bạn liên quan đến <strong>${safeSubjectLabel}</strong>.
                Đội ngũ concierge sẽ phản hồi trong vòng <strong>2 giờ làm việc</strong>.
              </p>

              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center;">
                <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Mã yêu cầu hỗ trợ của bạn</p>
                <p style="color:#1e3a8a;font-size:28px;font-weight:800;margin:0;font-family:'Courier New',monospace;">#${ticketId}</p>
              </div>

              ${
                accessCode
                  ? `
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center;">
                <p style="color:#9a3412;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Mã truy cập dành cho khách vãng lai</p>
                <p style="color:#7c2d12;font-size:18px;font-weight:800;margin:0;font-family:'Courier New',monospace;">${safeAccessCode}</p>
                ${safeTicketLookupUrl ? `<p style="margin:14px 0 0;"><a href="${safeTicketLookupUrl}" style="display:inline-block;background:#003f87;color:white;text-decoration:none;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;">Xem yêu cầu hỗ trợ</a></p>` : ''}
              </div>
              `
                  : ''
              }

              <div style="background:#f0f6ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Nội dung bạn đã gửi:</p>
                <p style="color:#1e293b;margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(ticketMessage)}</p>
              </div>

              <p style="color:#64748b;font-size:14px;line-height:1.7;text-align:center;margin:0 0 20px;">
                Đội ngũ hỗ trợ sẽ phản hồi trực tiếp qua email hoặc số điện thoại bạn đã cung cấp. Vui lòng giữ mã yêu cầu này để đối chiếu khi cần bổ sung thông tin.
              </p>

              <p style="color:#94a3b8;font-size:13px;text-align:center;">Nếu cần hỗ trợ khẩn cấp: <strong>${safeSupportEmail}${supportPhone ? ` - ${safeSupportPhone}` : ''}</strong></p>
            </div>
            <div style="background:#f1f5f9;padding:20px 30px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 ${safeCompanyName}. All rights reserved.</p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      // Không để lỗi DB phá vỡ luồng gửi mail chính
      this.logger.error(
        'Failed to create support ticket or send ticket confirmation email',
        getErrorMessage(err),
      );
    }

    return { message: 'Message sent successfully', ticketId, accessCode };
  }
}
