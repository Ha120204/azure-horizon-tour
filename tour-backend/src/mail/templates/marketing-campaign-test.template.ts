export function buildMarketingCampaignTestHtml(data: {
  safeSubject: string;
  safePreview: string;
  safeBody: string;
  safeCampaignName: string;
}): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#0f3d8a;padding:32px 28px;color:white;">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#bfdbfe;">Email gửi thử Azure Horizon</p>
        <h1 style="margin:0;font-size:26px;line-height:1.25;">${data.safeSubject}</h1>
        ${data.safePreview ? `<p style="margin:14px 0 0;color:#dbeafe;font-size:15px;line-height:1.6;">${data.safePreview}</p>` : ''}
      </div>
      <div style="padding:28px;background:white;">
        <p style="margin:0 0 16px;color:#64748b;font-size:13px;">Bản nháp chiến dịch: <strong style="color:#0f172a;">${data.safeCampaignName}</strong></p>
        <div style="color:#1e293b;font-size:15px;line-height:1.75;">${data.safeBody}</div>
        <div style="margin-top:28px;padding:16px;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:13px;line-height:1.6;">
          Đây là email gửi thử nội bộ. Chiến dịch chưa được gửi tới người đăng ký.
        </div>
      </div>
      <div style="padding:18px 28px;background:#f1f5f9;color:#94a3b8;font-size:12px;text-align:center;">
        © 2026 Azure Horizon. Chỉ dùng để gửi thử chiến dịch.
      </div>
    </div>
  `;
}
