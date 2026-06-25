export function buildWelcomeHtml(data: {
  fullName: string;
  to: string;
  password?: string;
  loginLink: string;
}): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #003f87, #0066cc); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Azure Horizon</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Your Premium Travel Experience</p>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #1a1a2e; margin: 0 0 16px; font-size: 22px;">Welcome, ${data.fullName}!</h2>
        <p style="color: #64748b; line-height: 1.6; margin: 0 0 16px;">
          Your account has been successfully created on Azure Horizon.
        </p>
        ${data.password ? `
        <div style="background: #f0f6ff; border: 1px solid #003f87; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="color: #1e293b; margin: 0 0 8px; font-size: 14px;">Here are your temporary login credentials:</p>
          <p style="margin: 4px 0; font-family: monospace; font-size: 16px;"><strong>Email:</strong> ${data.to}</p>
          <p style="margin: 4px 0; font-family: monospace; font-size: 16px;"><strong>Password:</strong> ${data.password}</p>
          <p style="color: #e11d48; font-size: 12px; margin: 8px 0 0;">Please change this password after your first login.</p>
        </div>
        ` : ''}
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.loginLink}"
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
  `;
}
