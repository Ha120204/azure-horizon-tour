export function buildPaymentRequestHtml(data: {
  customerName: string;
  bookingCode: string;
  tourName: string;
  startDate: string;
  duration: string;
  passengerBreakdown: string;
  totalPrice: string;
  discountAmount?: string;
  paymentUrl: string;
  qrMarkup: string;
  deadlineText: string;
}): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#0f3f9f;padding:30px 32px;">
        <h1 style="color:white;margin:0;font-size:24px;">Azure Horizon</h1>
        <p style="color:#dbeafe;margin:6px 0 0;font-size:13px;">Phieu xac nhan dat tour & yeu cau thanh toan</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">Xin chao <strong>${data.customerName}</strong>, vui long kiem tra lai thong tin dat tour ben duoi. Neu thong tin da dung, anh/chi thanh toan bang nut hoac QR kem theo.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:22px;">
          <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">Ma dat tour</p>
          <p style="margin:0;color:#0f3f9f;font-size:26px;font-weight:800;font-family:'Courier New',monospace;">${data.bookingCode}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
          <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:150px;">Tour</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:700;">${data.tourName}</td></tr>
          <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Khoi hanh</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:700;">${data.startDate}</td></tr>
          <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Thoi gian</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:700;">${data.duration}</td></tr>
          <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Hanh khach</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:700;">${data.passengerBreakdown}</td></tr>
          ${data.discountAmount ? `<tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Giam gia</td><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#16a34a;font-weight:700;">-${data.discountAmount}</td></tr>` : ''}
          <tr><td style="padding:14px 0;color:#0f3f9f;font-weight:800;">Tong thanh toan</td><td style="padding:14px 0;color:#0f3f9f;font-size:22px;font-weight:900;">${data.totalPrice}</td></tr>
        </table>
        <div style="text-align:center;margin:28px 0;"><a href="${data.paymentUrl}" style="display:inline-block;background:#0f3f9f;color:white;text-decoration:none;border-radius:999px;padding:14px 34px;font-size:15px;font-weight:800;">Thanh toan ngay</a></div>
        <div style="text-align:center;margin:22px 0;">
          <div style="display:inline-block;padding:12px;border:1px solid #dbe3ef;border-radius:18px;background:white;">${data.qrMarkup}</div>
          <p style="color:#64748b;font-size:12px;margin:10px 0 0;">Han thanh toan: <strong>${data.deadlineText}</strong></p>
        </div>
        <p style="color:#64748b;font-size:12px;line-height:1.6;text-align:center;margin:24px 0 0;">Neu thong tin chua dung, vui long phan hoi voi nhan vien tu van truoc khi thanh toan.</p>
      </div>
    </div>
  `;
}
