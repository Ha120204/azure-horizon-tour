export function buildCancelRequestHtml(data: {
  customerName: string;
  bookingCode: string;
  tourName: string;
  cancelReason: string;
  refundNote: string;
  refundAmount: number;
  formattedRefund: string;
}): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
      <div style="background: linear-gradient(135deg, #003f87, #0066cc); padding: 40px 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Azure Horizon</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Yêu Cầu Hủy Tour</p>
      </div>
      <div style="padding: 36px 32px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span style="font-size: 32px;">⏳</span>
          </div>
          <h2 style="color: #1a1a2e; margin: 0; font-size: 20px; font-weight: 700;">Yêu Cầu Hủy Đã Được Ghi Nhận</h2>
          <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">Xin chào <strong>${data.customerName}</strong>, chúng tôi đã nhận được yêu cầu hủy tour của bạn.</p>
        </div>

        <div style="background: #f0f6ff; border: 2px dashed #003f87; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <p style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">Mã Đặt Tour</p>
          <p style="color: #003f87; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; font-family: 'Courier New', monospace;">${data.bookingCode}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px; width: 160px;">Tour</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">${data.tourName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Lý Do Hủy</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">${data.cancelReason}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Chính Sách Hoàn Tiền</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">${data.refundNote}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${data.refundAmount > 0 ? '#003f87' : '#dc2626'}; font-size: 14px; font-weight: 700;">Dự Kiến Hoàn Tiền</td>
            <td style="padding: 12px 0; color: ${data.refundAmount > 0 ? '#003f87' : '#dc2626'}; font-size: 18px; font-weight: 800;">${data.formattedRefund}</td>
          </tr>
        </table>

        <div style="background: #fef3c7; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.6;">
            ⚠️ <strong>Lưu ý:</strong> Yêu cầu hủy của bạn đang chờ được xem xét bởi đội ngũ Azure Horizon.
            Chúng tôi sẽ xử lý và thông báo kết quả trong vòng <strong>1–3 ngày làm việc</strong>.
          </p>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6;">
          Mọi thắc mắc xin liên hệ hotline: <strong>+84 900 888 999</strong><br/>
          hoặc gửi yêu cầu hỗ trợ tại website của chúng tôi.
        </p>
      </div>
      <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 Azure Horizon. All rights reserved.</p>
      </div>
    </div>
  `;
}
