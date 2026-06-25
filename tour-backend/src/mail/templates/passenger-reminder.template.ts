import { escapeHtml } from './mail-utils';

export function buildPassengerReminderHtml(data: {
  customerName: string;
  bookingCode: string;
  tourName: string;
  startDate: string;
  incompleteCount: number;
  deadlineText: string;
  bookingUrl: string;
}): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#0f3f9f;padding:30px 32px;">
        <h1 style="color:white;margin:0;font-size:24px;">Azure Horizon</h1>
        <p style="color:#dbeafe;margin:6px 0 0;font-size:13px;">Nhac bo sung thong tin hanh khach</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">Xin chao <strong>${escapeHtml(data.customerName)}</strong>, don dat tour cua anh/chi van con <strong>${data.incompleteCount} hanh khach</strong> chua co day du thong tin. Vui long bo sung truoc <strong>${data.deadlineText}</strong> de bao dam ve va thu tuc khoi hanh.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:22px;">
          <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">Ma dat tour</p>
          <p style="margin:0;color:#0f3f9f;font-size:26px;font-weight:800;font-family:'Courier New',monospace;">${data.bookingCode}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
          <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:150px;">Tour</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:700;">${escapeHtml(data.tourName)}</td></tr>
          <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Khoi hanh</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:700;">${data.startDate}</td></tr>
          <tr><td style="padding:12px 0;color:#64748b;">Han bo sung</td><td style="padding:12px 0;color:#dc2626;font-weight:800;">${data.deadlineText}</td></tr>
        </table>
        <div style="text-align:center;margin:28px 0;"><a href="${data.bookingUrl}" style="display:inline-block;background:#0f3f9f;color:white;text-decoration:none;border-radius:999px;padding:14px 34px;font-size:15px;font-weight:800;">Bo sung thong tin ngay</a></div>
        <p style="color:#64748b;font-size:12px;line-height:1.6;text-align:center;margin:24px 0 0;">Neu can ho tro, anh/chi vui long lien he doi ngu cham soc khach hang cua chung toi.</p>
      </div>
    </div>
  `;
}
