import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
    const safeSubject = this.escapeHtml(data.subject);
    const safePreview = this.escapeHtml(data.previewText ?? '');
    const safeBody = this.escapeHtml(data.body).replace(/\n/g, '<br/>');
    const safeCampaignName = this.escapeHtml(data.campaignName || 'Chiến dịch tiếp thị');

    const info: unknown = await this.sendMail({
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `[GỬI THỬ] ${data.subject}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:#0f3d8a;padding:32px 28px;color:white;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#bfdbfe;">Email gửi thử Azure Horizon</p>
            <h1 style="margin:0;font-size:26px;line-height:1.25;">${safeSubject}</h1>
            ${safePreview ? `<p style="margin:14px 0 0;color:#dbeafe;font-size:15px;line-height:1.6;">${safePreview}</p>` : ''}
          </div>
          <div style="padding:28px;background:white;">
            <p style="margin:0 0 16px;color:#64748b;font-size:13px;">Bản nháp chiến dịch: <strong style="color:#0f172a;">${safeCampaignName}</strong></p>
            <div style="color:#1e293b;font-size:15px;line-height:1.75;">${safeBody}</div>
            <div style="margin-top:28px;padding:16px;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:13px;line-height:1.6;">
              Đây là email gửi thử nội bộ. Chiến dịch chưa được gửi tới người đăng ký.
            </div>
          </div>
          <div style="padding:18px 28px;background:#f1f5f9;color:#94a3b8;font-size:12px;text-align:center;">
            © 2026 Azure Horizon. Chỉ dùng để gửi thử chiến dịch.
          </div>
        </div>
      `,
    });
    return info;
  }

  async sendMarketingCampaignEmail(data: {
    to: string;
    subject: string;
    previewText?: string;
    body: string;
    campaignName?: string;
    unsubscribeToken: string;
  }) {
    const safeSubject = this.escapeHtml(data.subject);
    const safePreview = this.escapeHtml(data.previewText ?? '');
    const safeBody = this.escapeHtml(data.body).replace(/\n/g, '<br/>');
    const safeCampaignName = this.escapeHtml(data.campaignName || 'Bản tin Azure Horizon');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const unsubscribeUrl = `${frontendUrl.replace(/\/$/, '')}/vi/unsubscribe?token=${encodeURIComponent(data.unsubscribeToken)}`;
    const safeUnsubscribeUrl = this.escapeHtml(unsubscribeUrl);

    const info: unknown = await this.sendMail({
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: data.subject,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
      },
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:#0f3d8a;padding:34px 28px;color:white;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#bfdbfe;">Azure Horizon</p>
            <h1 style="margin:0;font-size:26px;line-height:1.25;">${safeSubject}</h1>
            ${safePreview ? `<p style="margin:14px 0 0;color:#dbeafe;font-size:15px;line-height:1.6;">${safePreview}</p>` : ''}
          </div>
          <div style="padding:28px;background:white;">
            <p style="margin:0 0 16px;color:#64748b;font-size:13px;">${safeCampaignName}</p>
            <div style="color:#1e293b;font-size:15px;line-height:1.75;">${safeBody}</div>
            <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;line-height:1.6;">
              Bạn nhận được email này vì đã đăng ký nhận tin từ Azure Horizon.
              <br/><a href="${safeUnsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Hủy đăng ký nhận tin</a>
            </div>
          </div>
          <div style="padding:18px 28px;background:#f1f5f9;color:#94a3b8;font-size:12px;text-align:center;">
            © 2026 Azure Horizon.
          </div>
        </div>
      `,
    });
    return info;
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const resetLink = `http://localhost:3001/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to,
      subject: 'Reset Your Password - Azure Horizon',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #003f87, #0066cc); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Azure Horizon</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Your Premium Travel Experience</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a2e; margin: 0 0 16px; font-size: 22px;">Password Reset Request</h2>
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 8px;">Hello,</p>
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 24px;">
              We received a request to reset your password for your Azure Horizon account.
              Click the button below to set a new password:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" 
                 style="background: linear-gradient(135deg, #003f87, #0066cc); color: white; padding: 14px 40px; 
                        text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; 
                        display: inline-block; box-shadow: 0 4px 15px rgba(0,63,135,0.3);">
                Reset Password
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">
              This link will expire in <strong>15 minutes</strong>.<br/>
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Azure Horizon. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      const info: unknown = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent successfully.');
      return info;
    } catch (error) {
      console.error('Error sending password reset email:', getErrorMessage(error));
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, fullName: string, password?: string) {
    const loginLink = `http://localhost:3001/login`;
    
    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to,
      subject: 'Welcome to Azure Horizon - Your Account Information',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #003f87, #0066cc); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Azure Horizon</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Your Premium Travel Experience</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a2e; margin: 0 0 16px; font-size: 22px;">Welcome, ${fullName}!</h2>
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 16px;">
              Your account has been successfully created on Azure Horizon. 
            </p>
            ${password ? `
            <div style="background: #f0f6ff; border: 1px solid #003f87; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #1e293b; margin: 0 0 8px; font-size: 14px;">Here are your temporary login credentials:</p>
              <p style="margin: 4px 0; font-family: monospace; font-size: 16px;"><strong>Email:</strong> ${to}</p>
              <p style="margin: 4px 0; font-family: monospace; font-size: 16px;"><strong>Password:</strong> ${password}</p>
              <p style="color: #e11d48; font-size: 12px; margin: 8px 0 0;">Please change this password after your first login.</p>
            </div>
            ` : ''}
            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginLink}" 
                 style="background: linear-gradient(135deg, #003f87, #0066cc); color: white; padding: 14px 40px; 
                        text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; 
                        display: inline-block; box-shadow: 0 4px 15px rgba(0,63,135,0.3);">
                Login to Your Account
              </a>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Azure Horizon. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      const info: unknown = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully.');
      return info;
    } catch (error) {
      console.error('Error sending welcome email:', getErrorMessage(error));
      // Optional: do not throw to avoid interrupting registration flow
      return null;
    }
  }

  /**
   * Gửi email xác nhận đặt tour thành công (E-Ticket).
   */
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
    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `✈️ Booking Confirmed — ${data.bookingCode} | Azure Horizon`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #003f87, #0066cc); padding: 40px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Azure Horizon</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">E-Ticket Confirmation</p>
          </div>

          <!-- Content -->
          <div style="padding: 36px 32px;">
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="width: 64px; height: 64px; background: #e8f4e8; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                <span style="font-size: 32px;">✅</span>
              </div>
              <h2 style="color: #1a1a2e; margin: 0; font-size: 22px; font-weight: 700;">Đặt Tour Thành Công!</h2>
              <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">Cảm ơn <strong>${data.customerName}</strong>, đây là vé điện tử của bạn.</p>
            </div>

            <!-- Booking Code -->
            <div style="background: #f0f6ff; border: 2px dashed #003f87; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">Mã Đặt Tour</p>
              <p style="color: #003f87; font-size: 28px; font-weight: 800; letter-spacing: 2px; margin: 0; font-family: 'Courier New', monospace;">${data.bookingCode}</p>
            </div>

            <!-- Tour Details -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px; width: 140px;">Tour</td>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">${data.tourName}</td>
              </tr>
              <tr>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Ngày Khởi Hành</td>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">📅 ${data.startDate}</td>
              </tr>
              <tr>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Thời Gian</td>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">⏱️ ${data.duration}</td>
              </tr>
              <tr>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Số Hành Khách</td>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">👥 ${data.numberOfPeople} người</td>
              </tr>
              ${data.discountAmount ? `
              <tr>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Giảm Giá</td>
                <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #16a34a; font-size: 14px; font-weight: 600;">🎉 -${data.discountAmount}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 14px 0; color: #003f87; font-size: 14px; font-weight: 700;">TỔNG THANH TOÁN</td>
                <td style="padding: 14px 0; color: #003f87; font-size: 20px; font-weight: 800;">${data.totalPrice}</td>
              </tr>
            </table>

            <!-- QR Code Vé Điện Tử -->
            <div style="text-align: center; margin: 32px 0 16px;">
              <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px; font-weight: 600;">Quét mã QR khi check-in</p>
              <div style="display: inline-block; background: white; padding: 12px; border-radius: 16px; border: 2px solid #e2e8f0; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`AZURE-HORIZON|${data.bookingCode}|${data.tourName}|${data.numberOfPeople}PAX`)}" 
                     alt="QR Code Vé" 
                     width="180" height="180" 
                     style="display: block; border-radius: 8px;" />
              </div>
              <p style="color: #003f87; font-size: 16px; font-weight: 800; font-family: 'Courier New', monospace; margin: 12px 0 0; letter-spacing: 1px;">${data.bookingCode}</p>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6; margin: 24px 0 0;">
              Vui lòng xuất trình mã QR này khi check-in tại điểm tour.<br/>
              Mọi thắc mắc xin liên hệ hotline: <strong>+84 900 888 999</strong>
            </p>

            <!-- Button Xem Chi Tiết -->
            <div style="text-align: center; margin: 24px 0 0;">
              <a href="http://localhost:3001/success?bookingId=${data.bookingCode}"
                 style="background: linear-gradient(135deg, #003f87, #0066cc); color: white; padding: 12px 36px;
                        text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 14px;
                        display: inline-block; box-shadow: 0 4px 15px rgba(0,63,135,0.3);">
                📋 Xem Chi Tiết Vé
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 Azure Horizon. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      const info: unknown = await this.transporter.sendMail(mailOptions);
      console.log('Booking confirmation email sent successfully.');
      return info;
    } catch (error) {
      console.error('Error sending booking confirmation:', getErrorMessage(error));
      // Không throw — email thất bại không nên ảnh hưởng luồng chính
    }
  }

  /**
   * Email xác nhận đã nhận yêu cầu hủy tour (gửi cho khách hàng)
   */
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
    qrCodeUrl?: string;
    deadlineText: string;
  }) {
    const qrMarkup = data.qrCodeUrl
      ? `<img src="${data.qrCodeUrl}" alt="QR thanh toan" width="180" height="180" style="display:block;border-radius:12px;" />`
      : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.paymentUrl)}" alt="QR thanh toan" width="180" height="180" style="display:block;border-radius:12px;" />`;

    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `Xac nhan thong tin dat tour va thanh toan - ${data.bookingCode}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:#0f3f9f;padding:30px 32px;">
            <h1 style="color:white;margin:0;font-size:24px;">Azure Horizon</h1>
            <p style="color:#dbeafe;margin:6px 0 0;font-size:13px;">Phieu xac nhan dat tour & yeu cau thanh toan</p>
          </div>
          <div style="padding:32px;">
            <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">Xin chao <strong>${data.customerName}</strong>, vui long kiem tra lai thong tin dat tour ben duoi. Neu thong tin da dung, anh/chi thanh toan bang nut hoac QR kem theo.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:22px;">
              <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">Ma dat tour</p>
              <p style="margin:0;color:#0f3f9f;font-size:26px;font-weight:800;font-family:'Courier New',monospace;">${data.bookingCode}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
              <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:150px;">Tour</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:700;">${data.tourName}</td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Khoi hanh</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:700;">${data.startDate}</td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Thoi gian</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:700;">${data.duration}</td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Hanh khach</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:700;">${data.passengerBreakdown}</td></tr>
              ${data.discountAmount ? `<tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Giam gia</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#16a34a;font-weight:700;">-${data.discountAmount}</td></tr>` : ''}
              <tr><td style="padding:14px 0;color:#0f3f9f;font-weight:800;">Tong thanh toan</td><td style="padding:14px 0;color:#0f3f9f;font-size:22px;font-weight:900;">${data.totalPrice}</td></tr>
            </table>
            <div style="text-align:center;margin:28px 0;"><a href="${data.paymentUrl}" style="display:inline-block;background:#0f3f9f;color:white;text-decoration:none;border-radius:999px;padding:14px 34px;font-size:15px;font-weight:800;">Thanh toan ngay</a></div>
            <div style="text-align:center;margin:22px 0;">
              <div style="display:inline-block;padding:12px;border:1px solid #dbe3ef;border-radius:18px;background:white;">${qrMarkup}</div>
              <p style="color:#64748b;font-size:12px;margin:10px 0 0;">Han thanh toan: <strong>${data.deadlineText}</strong></p>
            </div>
            <p style="color:#64748b;font-size:12px;line-height:1.6;text-align:center;margin:24px 0 0;">Neu thong tin chua dung, vui long phan hoi voi nhan vien tu van truoc khi thanh toan.</p>
          </div>
        </div>
      `,
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
    refundNote: string; // "Hoàn 100%" | "Hoàn 50%" | "Không hoàn"
  }) {
    const formattedRefund = data.refundAmount > 0
      ? data.refundAmount.toLocaleString('vi-VN') + 'đ'
      : 'Không hoàn tiền (theo chính sách hủy tour)';

    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `⏳ Yêu Cầu Hủy Tour Đã Được Ghi Nhận — ${data.bookingCode}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #003f87, #0066cc); padding: 40px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Azure Horizon</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Yêu Cầu Hủy Tour</p>
          </div>
          <div style="padding: 36px 32px;">
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                <span style="font-size: 32px;">⏳</span>
              </div>
              <h2 style="color: #1a1a2e; margin: 0; font-size: 20px; font-weight: 700;">Yêu Cầu Hủy Đã Được Ghi Nhận</h2>
              <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">Xin chào <strong>${data.customerName}</strong>, chúng tôi đã nhận được yêu cầu hủy tour của bạn.</p>
            </div>

            <div style="background: #f0f6ff; border: 2px dashed #003f87; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">Mã Đặt Tour</p>
              <p style="color: #003f87; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; font-family: 'Courier New', monospace;">${data.bookingCode}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px; width: 160px;">Tour</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">${data.tourName}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Lý Do Hủy</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">${data.cancelReason}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Chính Sách Hoàn Tiền</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">${data.refundNote}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: ${data.refundAmount > 0 ? '#003f87' : '#dc2626'}; font-size: 14px; font-weight: 700;">Dự Kiến Hoàn Tiền</td>
                <td style="padding: 12px 0; color: ${data.refundAmount > 0 ? '#003f87' : '#dc2626'}; font-size: 18px; font-weight: 800;">${formattedRefund}</td>
              </tr>
            </table>

            <div style="background: #fef3c7; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
              <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.6;">
                ⚠️ <strong>Lưu ý:</strong> Yêu cầu hủy của bạn đang chờ được xem xét bởi đội ngũ Azure Horizon. 
                Chúng tôi sẽ xử lý và thông báo kết quả trong vòng <strong>1–3 ngày làm việc</strong>.
              </p>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6;">
              Mọi thắc mắc xin liên hệ hotline: <strong>+84 900 888 999</strong><br/>
              hoặc gửi yêu cầu hỗ trợ tại website của chúng tôi.
            </p>
          </div>
          <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 Azure Horizon. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Cancel request email sent successfully.');
    } catch (error) {
      console.error('Error sending cancel request email:', getErrorMessage(error));
    }
  }

  /**
   * Email thông báo yêu cầu hủy được DUYỆT (Admin approve)
   */
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

    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `✅ Yêu Cầu Hủy Tour Được Chấp Thuận — ${data.bookingCode}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #003f87, #0066cc); padding: 40px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Azure Horizon</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Xác Nhận Hủy Tour</p>
          </div>
          <div style="padding: 36px 32px;">
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                <span style="font-size: 32px;">✅</span>
              </div>
              <h2 style="color: #1a1a2e; margin: 0; font-size: 20px; font-weight: 700;">Yêu Cầu Hủy Đã Được Chấp Thuận</h2>
              <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">Xin chào <strong>${data.customerName}</strong>, tour của bạn đã được hủy thành công.</p>
            </div>

            <div style="background: #f0f6ff; border: 2px dashed #003f87; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">Mã Đặt Tour</p>
              <p style="color: #003f87; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; font-family: 'Courier New', monospace;">${data.bookingCode}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px; width: 160px;">Tour Đã Hủy</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">${data.tourName}</td>
              </tr>
              ${data.adminNote ? `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Ghi Chú</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">${data.adminNote}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 12px 0; color: ${data.refundAmount > 0 ? '#16a34a' : '#dc2626'}; font-size: 14px; font-weight: 700;">Số Tiền Hoàn Lại</td>
                <td style="padding: 12px 0; color: ${data.refundAmount > 0 ? '#16a34a' : '#dc2626'}; font-size: 20px; font-weight: 800;">${formattedRefund}</td>
              </tr>
            </table>

            ${data.refundAmount > 0 ? `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
              <p style="color: #166534; font-size: 13px; margin: 0; line-height: 1.6;">
                💳 Số tiền <strong>${formattedRefund}</strong> sẽ được hoàn về phương thức thanh toán ban đầu của bạn trong vòng <strong>3–7 ngày làm việc</strong>.
              </p>
            </div>` : ''}

            <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6;">
              Cảm ơn bạn đã sử dụng dịch vụ của Azure Horizon.<br/>
              Chúng tôi mong được phục vụ bạn trong những chuyến đi tiếp theo! 🌟
            </p>
          </div>
          <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 Azure Horizon. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Cancellation approved email sent successfully.');
    } catch (error) {
      console.error('Error sending cancellation approved email:', getErrorMessage(error));
    }
  }

  /**
   * Email thông báo yêu cầu hủy bị TỪ CHỐI (Admin reject)
   */
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
    const hasOutbound = data.outboundTicketCodes.length > 0 || data.outboundPnrCode;
    const hasReturn = data.returnTicketCodes.length > 0 || data.returnPnrCode;
    const hasVehicle = data.vehiclePlate || data.seatNumbers.length > 0;

    const ticketRow = (label: string, value: string) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;width:150px;">${label}</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;font-weight:600;font-family:'Courier New',monospace;">${this.escapeHtml(value)}</td></tr>`;

    const outboundSection = hasOutbound ? `
      <div style="margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0f3f9f;">✈️ Chiều đi</p>
        <table style="width:100%;border-collapse:collapse;">
          ${data.outboundPnrCode ? ticketRow('PNR', data.outboundPnrCode) : ''}
          ${data.outboundTicketCodes.map((c, i) => ticketRow(`Mã vé ${i + 1}`, c)).join('')}
          ${data.outboundSeatNumbers.length > 0 ? ticketRow('Số ghế', data.outboundSeatNumbers.join(', ')) : ''}
        </table>
      </div>` : '';

    const returnSection = hasReturn ? `
      <div style="margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0f3f9f;">✈️ Chiều về</p>
        <table style="width:100%;border-collapse:collapse;">
          ${data.returnPnrCode ? ticketRow('PNR', data.returnPnrCode) : ''}
          ${data.returnTicketCodes.map((c, i) => ticketRow(`Mã vé ${i + 1}`, c)).join('')}
          ${data.returnSeatNumbers.length > 0 ? ticketRow('Số ghế', data.returnSeatNumbers.join(', ')) : ''}
        </table>
      </div>` : '';

    const vehicleSection = hasVehicle ? `
      <div style="margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0f3f9f;">🚌 Phương tiện</p>
        <table style="width:100%;border-collapse:collapse;">
          ${data.vehiclePlate ? ticketRow('Biển số', data.vehiclePlate) : ''}
          ${data.seatNumbers.length > 0 ? ticketRow('Số ghế', data.seatNumbers.join(', ')) : ''}
        </table>
      </div>` : '';

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';

    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `🎫 Thông Tin Vé Của Bạn — ${data.bookingCode} | Azure Horizon`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#003f87,#0066cc);padding:40px 32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:26px;font-weight:700;">Azure Horizon</h1>
            <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Thông Tin Vé & Phương Tiện</p>
          </div>
          <div style="padding:36px 32px;">
            <div style="text-align:center;margin-bottom:28px;">
              <div style="width:64px;height:64px;background:#eff6ff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <span style="font-size:32px;">🎫</span>
              </div>
              <h2 style="color:#1a1a2e;margin:0;font-size:20px;font-weight:700;">Vé của bạn đã sẵn sàng!</h2>
              <p style="color:#64748b;margin:8px 0 0;font-size:14px;">Xin chào <strong>${this.escapeHtml(data.customerName)}</strong>, thông tin vé cho chuyến đi của bạn đã được cập nhật.</p>
            </div>

            <div style="background:#f0f6ff;border:2px dashed #003f87;border-radius:12px;padding:16px 20px;text-align:center;margin-bottom:24px;">
              <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Mã Đặt Tour</p>
              <p style="color:#003f87;font-size:24px;font-weight:800;letter-spacing:2px;margin:0 0 4px;font-family:'Courier New',monospace;">${this.escapeHtml(data.bookingCode)}</p>
              <p style="color:#64748b;font-size:13px;margin:0;">${this.escapeHtml(data.tourName)}</p>
            </div>

            <div style="border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px;">
              ${outboundSection}${returnSection}${vehicleSection}
              ${data.notes ? `<p style="color:#64748b;font-size:13px;margin:12px 0 0;padding-top:12px;border-top:1px solid #f1f5f9;">${this.escapeHtml(data.notes)}</p>` : ''}
            </div>

            <div style="text-align:center;margin:24px 0 0;">
              <a href="${frontendUrl}/vi/my-bookings"
                 style="background:linear-gradient(135deg,#003f87,#0066cc);color:white;padding:12px 36px;text-decoration:none;border-radius:50px;font-weight:600;font-size:14px;display:inline-block;box-shadow:0 4px 15px rgba(0,63,135,0.3);">
                Xem chi tiết đặt tour
              </a>
            </div>

            <p style="color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;margin:20px 0 0;">
              Mọi thắc mắc xin liên hệ hotline: <strong>+84 900 888 999</strong>
            </p>
          </div>
          <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">© 2026 Azure Horizon. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
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
      ? `${frontendUrl}/support/track/${data.ticketId}?accessCode=${encodeURIComponent(data.accessCode)}`
      : `${frontendUrl}/support/track/${data.ticketId}`;

    const safeCustomerName = this.escapeHtml(data.customerName);
    const safeSubject      = this.escapeHtml(data.subject);
    const safeReply        = this.escapeHtml(data.replyContent).replace(/\n/g, '<br/>');
    const safeStaffName    = this.escapeHtml(data.staffName);
    const safeTrackUrl     = this.escapeHtml(trackUrl);

    try {
      await this.sendMail({
        from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
        to: data.to,
        subject: `[Yêu cầu #${data.ticketId}] Nhân viên đã phản hồi yêu cầu của bạn`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:linear-gradient(135deg,#003f87,#0066cc);padding:32px 28px;">
              <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">Azure Horizon</h1>
              <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Hỗ trợ khách hàng</p>
            </div>
            <div style="padding:32px 28px;">
              <p style="color:#1e293b;font-size:15px;margin:0 0 6px;">Xin chào <strong>${safeCustomerName}</strong>,</p>
              <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px;">
                Nhân viên hỗ trợ đã phản hồi yêu cầu <strong>#${data.ticketId}</strong> của bạn.
              </p>

              <div style="background:#f8fafc;border-left:4px solid #003f87;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
                <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px;">Chủ đề yêu cầu</p>
                <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0;">${safeSubject}</p>
              </div>

              <div style="border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:28px;">
                <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 12px;">Phản hồi từ ${safeStaffName}</p>
                <p style="color:#1e293b;font-size:14px;line-height:1.75;margin:0;">${safeReply}</p>
              </div>

              <div style="text-align:center;">
                <a href="${safeTrackUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#003f87,#0066cc);color:white;text-decoration:none;border-radius:999px;padding:12px 32px;font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(0,63,135,0.25);">
                  Xem yêu cầu hỗ trợ
                </a>
              </div>

              <p style="color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;margin:24px 0 0;">
                Bạn có thể trả lời trực tiếp trên trang theo dõi yêu cầu.<br/>
                Mọi thắc mắc: <strong>+84 900 888 999</strong>
              </p>
            </div>
            <div style="background:#f1f5f9;padding:18px 28px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 Azure Horizon. All rights reserved.</p>
            </div>
          </div>
        `,
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
    const mailOptions = {
      from: `"Azure Horizon" <${this.configService.get('MAIL_USER')}>`,
      to: data.to,
      subject: `❌ Yêu Cầu Hủy Tour Bị Từ Chối — ${data.bookingCode}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #003f87, #0066cc); padding: 40px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Azure Horizon</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Kết Quả Yêu Cầu Hủy</p>
          </div>
          <div style="padding: 36px 32px;">
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                <span style="font-size: 32px;">❌</span>
              </div>
              <h2 style="color: #1a1a2e; margin: 0; font-size: 20px; font-weight: 700;">Yêu Cầu Hủy Bị Từ Chối</h2>
              <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">Xin chào <strong>${data.customerName}</strong>, đây là thông báo về yêu cầu hủy tour của bạn.</p>
            </div>

            <div style="background: #f0f6ff; border: 2px dashed #003f87; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">Mã Đặt Tour</p>
              <p style="color: #003f87; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; font-family: 'Courier New', monospace;">${data.bookingCode}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px; width: 160px;">Tour</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">${data.tourName}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #dc2626; font-size: 13px; font-weight: 600;">Lý Do Từ Chối</td>
                <td style="padding: 12px 0; color: #1e293b; font-size: 14px;">${data.rejectReason}</td>
              </tr>
            </table>

            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
              <p style="color: #991b1b; font-size: 13px; margin: 0; line-height: 1.6;">
                ℹ️ Đặt tour của bạn vẫn còn hiệu lực. Nếu bạn có thắc mắc về quyết định này, vui lòng liên hệ đội ngũ hỗ trợ của chúng tôi.
              </p>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6;">
              Hotline: <strong>+84 900 888 999</strong><br/>
              Chúng tôi luôn sẵn sàng hỗ trợ bạn!
            </p>
          </div>
          <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 Azure Horizon. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Cancellation rejected email sent successfully.');
    } catch (error) {
      console.error('Error sending cancellation rejected email:', getErrorMessage(error));
    }
  }
}
