export function buildCancellationApprovedHtml(data: {
  customerName: string;
  bookingCode: string;
  tourName: string;
  adminNote?: string;
  refundAmount: number;
  formattedRefund: string;
}): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
      <div style="background: linear-gradient(135deg, #003f87, #0066cc); padding: 40px 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Azure Horizon</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Xác Nhận Hủy Tour</p>
      </div>
      <div style="padding: 36px 32px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span style="font-size: 32px;">✅</span>
          </div>
          <h2 style="color: #1a1a2e; margin: 0; font-size: 20px; font-weight: 700;">Yêu Cầu Hủy Đã Được Chấp Thuận</h2>
          <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">Xin chào <strong>${data.customerName}</strong>, tour của bạn đã được hủy thành công.</p>
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
          ${data.adminNote ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Ghi Chú</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">${data.adminNote}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 12px 0; color: ${data.refundAmount > 0 ? '#16a34a' : '#dc2626'}; font-size: 14px; font-weight: 700;">Số Tiền Hoàn Lại</td>
            <td style="padding: 12px 0; color: ${data.refundAmount > 0 ? '#16a34a' : '#dc2626'}; font-size: 20px; font-weight: 800;">${data.formattedRefund}</td>
          </tr>
        </table>

        ${data.refundAmount > 0 ? `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
          <p style="color: #166534; font-size: 13px; margin: 0; line-height: 1.6;">
            💳 Số tiền <strong>${data.formattedRefund}</strong> sẽ được hoàn về phương thức thanh toán ban đầu của bạn trong vòng <strong>3–7 ngày làm việc</strong>.
          </p>
        </div>` : ''}

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
