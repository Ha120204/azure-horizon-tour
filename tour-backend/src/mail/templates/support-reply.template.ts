export function buildSupportReplyHtml(data: {
  safeCustomerName: string;
  ticketId: number;
  safeSubject: string;
  safeReply: string;
  safeStaffName: string;
  safeTrackUrl: string;
}): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#003f87,#0066cc);padding:32px 28px;">
        <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">Azure Horizon</h1>
        <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Hỗ trợ khách hàng</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="color:#1e293b;font-size:15px;margin:0 0 6px;">Xin chào <strong>${data.safeCustomerName}</strong>,</p>
        <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px;">
          Nhân viên hỗ trợ đã phản hồi yêu cầu <strong>#${data.ticketId}</strong> của bạn.
        </p>

        <div style="background:#f8fafc;border-left:4px solid #003f87;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
          <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px;">Chủ đề yêu cầu</p>
          <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0;">${data.safeSubject}</p>
        </div>

        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:28px;">
          <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 12px;">Phản hồi từ ${data.safeStaffName}</p>
          <p style="color:#1e293b;font-size:14px;line-height:1.75;margin:0;">${data.safeReply}</p>
        </div>

        <div style="text-align:center;">
          <a href="${data.safeTrackUrl}"
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
  `;
}
