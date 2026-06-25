export function buildRefundCompletedHtml(data: {
  customerName: string;
  bookingCode: string;
  tourName: string;
  note?: string;
  formattedRefund: string;
}): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
      <div style="background: linear-gradient(135deg, #166534, #16a34a); padding: 40px 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Azure Horizon</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Xác Nhận Hoàn Tiền</p>
      </div>
      <div style="padding: 36px 32px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span style="font-size: 32px;">💳</span>
          </div>
          <h2 style="color: #1a1a2e; margin: 0; font-size: 20px; font-weight: 700;">Khoản Hoàn Tiền Đã Được Chuyển</h2>
          <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">Xin chào <strong>${data.customerName}</strong>, chúng tôi đã hoàn tất việc hoàn tiền cho đơn của bạn.</p>
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
          ${data.note ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Ghi Chú</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">${data.note}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 12px 0; color: #16a34a; font-size: 14px; font-weight: 700;">Số Tiền Đã Hoàn</td>
            <td style="padding: 12px 0; color: #16a34a; font-size: 20px; font-weight: 800;">${data.formattedRefund}</td>
          </tr>
        </table>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
          <p style="color: #166534; font-size: 13px; margin: 0; line-height: 1.6;">
            ✅ Số tiền <strong>${data.formattedRefund}</strong> đã được chuyển. Tùy theo ngân hàng, khoản tiền có thể cần thêm <strong>1–3 ngày làm việc</strong> để hiển thị trong tài khoản của bạn.
          </p>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6;">
          Cảm ơn bạn đã sử dụng dịch vụ của Azure Horizon.<br/>
          Chúng tôi mong được phục vụ bạn trong những chuyến đi tiếp theo! 🌟
        </p>
      </div>
      <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 Azure Horizon. All rights reserved.</p>
      </div>
    </div>
  `;
}
