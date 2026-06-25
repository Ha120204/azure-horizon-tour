import { escapeHtml } from './mail-utils';

export function buildTransportAssignedHtml(data: {
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
  frontendUrl: string;
}): string {
  const hasOutbound = data.outboundTicketCodes.length > 0 || data.outboundPnrCode;
  const hasReturn = data.returnTicketCodes.length > 0 || data.returnPnrCode;
  const hasVehicle = data.vehiclePlate || data.seatNumbers.length > 0;

  const ticketRow = (label: string, value: string) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;width:150px;">${label}</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;font-weight:600;font-family:'Courier New',monospace;">${escapeHtml(value)}</td></tr>`;

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

  return `
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
          <p style="color:#64748b;margin:8px 0 0;font-size:14px;">Xin chào <strong>${escapeHtml(data.customerName)}</strong>, thông tin vé cho chuyến đi của bạn đã được cập nhật.</p>
        </div>

        <div style="background:#f0f6ff;border:2px dashed #003f87;border-radius:12px;padding:16px 20px;text-align:center;margin-bottom:24px;">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Mã Đặt Tour</p>
          <p style="color:#003f87;font-size:24px;font-weight:800;letter-spacing:2px;margin:0 0 4px;font-family:'Courier New',monospace;">${escapeHtml(data.bookingCode)}</p>
          <p style="color:#64748b;font-size:13px;margin:0;">${escapeHtml(data.tourName)}</p>
        </div>

        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px;">
          ${outboundSection}${returnSection}${vehicleSection}
          ${data.notes ? `<p style="color:#64748b;font-size:13px;margin:12px 0 0;padding-top:12px;border-top:1px solid #f1f5f9;">${escapeHtml(data.notes)}</p>` : ''}
        </div>

        <div style="text-align:center;margin:24px 0 0;">
          <a href="${data.frontendUrl}/vi/my-bookings"
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
  `;
}
