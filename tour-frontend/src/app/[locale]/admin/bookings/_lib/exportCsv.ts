import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { PAY_CFG, STATUS_CFG } from './config';
import { fmtDate } from './helpers';
import type { Booking } from './types';

export async function exportBookingsCsv(queryString: string): Promise<number> {
  const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/all?${queryString}`);
  const json = await res.json();
  if (!res.ok) throw new Error();

  const payload = json?.data ?? json;
  const allBookings: Booking[] = payload.bookings ?? [];
  if (allBookings.length === 0) return 0;

  const headers = [
    'Mã Đặt Tour', 'Khách Hàng', 'Email', 'Tour', 'Điểm Đến',
    'Số Người', 'Đơn Giá (₫)', 'Voucher', 'Giảm Giá (₫)',
    'Tổng Tiền (₫)', 'Trạng Thái', 'Thanh Toán', 'Ngày Đặt',
  ];

  const rows = allBookings.map(booking => [
    booking.bookingCode,
    booking.user.fullName,
    booking.user.email,
    booking.tour?.name ?? '',
    booking.tour?.destination?.name ?? '',
    booking.numberOfPeople,
    booking.unitPriceAtBooking,
    booking.voucherCode ?? '',
    booking.discountAmount,
    booking.totalPrice,
    STATUS_CFG[booking.status]?.label ?? booking.status,
    PAY_CFG[booking.paymentStatus]?.label ?? booking.paymentStatus,
    fmtDate(booking.createdAt),
  ]);

  const BOM = '\uFEFF';
  const csvContent = BOM + [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `azure-horizon-bookings-${dateStr}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return allBookings.length;
}
