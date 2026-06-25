export function buildBookingConfirmationHtml(data: {
  customerName: string;
  bookingCode: string;
  tourName: string;
  startDate: string;
  duration: string;
  numberOfPeople: number;
  totalPrice: string;
  discountAmount?: string;
  frontendUrl: string;
}): string {
  return `
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

        <!-- QR Code -->
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

        <!-- Button -->
        <div style="text-align: center; margin: 24px 0 0;">
          <a href="${data.frontendUrl}/vi/my-bookings"
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
  `;
}
