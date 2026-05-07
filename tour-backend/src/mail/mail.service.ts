import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully to:', to);
      return info;
    } catch (error) {
      console.error('❌ Error sending email:', error);
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
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully to:', to);
      return info;
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
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
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Booking confirmation email sent to:', data.to);
      return info;
    } catch (error) {
      console.error('❌ Error sending booking confirmation:', error);
      // Không throw — email thất bại không nên ảnh hưởng luồng chính
    }
  }

  /**
   * Email xác nhận đã nhận yêu cầu hủy tour (gửi cho khách hàng)
   */
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
      console.log('✅ Cancel request email sent to:', data.to);
    } catch (error) {
      console.error('❌ Error sending cancel request email:', error);
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
      console.log('✅ Cancellation approved email sent to:', data.to);
    } catch (error) {
      console.error('❌ Error sending cancellation approved email:', error);
    }
  }

  /**
   * Email thông báo yêu cầu hủy bị TỪ CHỐI (Admin reject)
   */
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
      console.log('✅ Cancellation rejected email sent to:', data.to);
    } catch (error) {
      console.error('❌ Error sending cancellation rejected email:', error);
    }
  }
}