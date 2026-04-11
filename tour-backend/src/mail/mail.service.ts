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
}