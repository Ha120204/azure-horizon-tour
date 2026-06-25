export function buildPasswordResetHtml(data: {
  greeting: string;
  bodyText: string;
  codeLabel: string;
  otp: string;
  expiryText: string;
  warningTitle: string;
  warningText: string;
}): string {
  const otpDigits = data.otp
    .split('')
    .map(
      (d) =>
        `<span style="display:inline-block;width:46px;height:56px;line-height:56px;text-align:center;font-size:30px;font-weight:800;color:#003f87;background:white;border:2px solid #c7deff;border-radius:10px;margin:0 4px;">${d}</span>`,
    )
    .join('');

  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;">
      <div style="background:linear-gradient(135deg,#003f87,#0066cc);padding:32px 30px;text-align:center;border-radius:16px 16px 0 0;">
        <h1 style="color:white;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Azure Horizon</h1>
        <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Your Premium Travel Experience</p>
      </div>

      <div style="background:white;padding:36px 32px;">
        <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 8px;">${data.greeting}</p>
        <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">${data.bodyText}</p>

        <div style="background:#f0f6ff;border:1.5px solid #c7deff;border-radius:14px;padding:24px 20px;text-align:center;margin-bottom:24px;">
          <p style="color:#6b7280;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 14px;">${data.codeLabel}</p>
          <div style="text-align:center;">${otpDigits}</div>
        </div>

        <p style="color:#64748b;font-size:13px;text-align:center;margin:0 0 24px;">
          🕐 ${data.expiryText}
        </p>

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;">
          <p style="color:#92400e;font-size:13px;font-weight:700;margin:0 0 6px;">${data.warningTitle}</p>
          <p style="color:#a16207;font-size:13px;line-height:1.6;margin:0;">${data.warningText}</p>
        </div>
      </div>

      <div style="background:#f1f5f9;padding:16px 30px;text-align:center;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 Azure Horizon. All rights reserved.</p>
      </div>
    </div>
  `;
}
