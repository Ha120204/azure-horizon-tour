'use client';

import { useEffect, useState } from 'react';
import QRCodeGen from 'qrcode';

// QR thanh toán để nhân viên tải về gửi khách qua Zalo/chat.
// Ưu tiên chuỗi VietQR thô từ PayOS (quét ra chuyển khoản điền sẵn số tiền + nội dung);
// nếu không có thì render QR của link thanh toán làm dự phòng.
// Render cục bộ bằng qrcode lib — không gửi dữ liệu ra dịch vụ ngoài, không lo CORS.
export function PaymentQrCode({
  qrCodeData,
  paymentUrl,
  bookingCode,
}: {
  qrCodeData?: string | null;
  paymentUrl?: string | null;
  bookingCode: string;
}) {
  const [dataUrl, setDataUrl] = useState('');

  // qrCodeData mới là chuỗi VietQR thô. Dữ liệu cũ có thể là URL ảnh (bắt đầu bằng http)
  // — khi đó bỏ qua, dùng paymentUrl để vẫn có một QR quét được.
  const qrValue =
    qrCodeData && !/^https?:\/\//.test(qrCodeData) ? qrCodeData : paymentUrl ?? '';

  useEffect(() => {
    if (!qrValue) return;
    let active = true;
    QRCodeGen.toDataURL(qrValue, {
      width: 220,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(url => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [qrValue]);

  if (!qrValue || !dataUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR-thanh-toan-${bookingCode}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- data URI QR sinh cục bộ, không dùng next/image */}
      <img
        src={dataUrl}
        alt={`Mã QR thanh toán đơn ${bookingCode}`}
        width={96}
        height={96}
        className="h-24 w-24 rounded-lg"
      />
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-700">Mã QR thanh toán</p>
        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
          Tải ảnh rồi gửi khách qua Zalo/chat. Khách quét bằng app ngân hàng (hoặc quét từ thư viện ảnh).
        </p>
        <button
          type="button"
          onClick={handleDownload}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <span className="material-symbols-outlined text-[15px]">download</span>
          Tải ảnh QR
        </button>
      </div>
    </div>
  );
}
