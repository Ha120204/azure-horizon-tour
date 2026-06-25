export function buildMarketingCampaignHtml(data: {
  safeSubject: string;
  safePreview: string;
  safeBody: string;
  safeCampaignName: string;
  safeUnsubscribeUrl: string;
  rawUnsubscribeUrl: string;
}): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#0f3d8a;padding:34px 28px;color:white;">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#bfdbfe;">Azure Horizon</p>
        <h1 style="margin:0;font-size:26px;line-height:1.25;">${data.safeSubject}</h1>
        ${data.safePreview ? `<p style="margin:14px 0 0;color:#dbeafe;font-size:15px;line-height:1.6;">${data.safePreview}</p>` : ''}
      </div>
      <div style="padding:28px;background:white;">
        <p style="margin:0 0 16px;color:#64748b;font-size:13px;">${data.safeCampaignName}</p>
        <div style="color:#1e293b;font-size:15px;line-height:1.75;">${data.safeBody}</div>
        <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Bạn nhận được email này vì đã đăng ký nhận tin từ Azure Horizon.
          <br/><a href="${data.safeUnsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Hủy đăng ký nhận tin</a>
        </div>
      </div>
      <div style="padding:18px 28px;background:#f1f5f9;color:#94a3b8;font-size:12px;text-align:center;">
        © 2026 Azure Horizon.
      </div>
    </div>
  `;
}
