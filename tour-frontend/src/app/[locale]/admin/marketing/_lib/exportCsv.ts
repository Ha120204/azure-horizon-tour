import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { escapeCsv, formatDate } from './helpers';
import type { Subscriber, SubscriberStatus } from './types';

interface ExportSubscribersCsvOptions {
  search: string;
  status: SubscriberStatus;
}

export async function exportSubscribersCsv({ search, status }: ExportSubscribersCsvOptions) {
  const qs = new URLSearchParams();
  qs.set('page', '1');
  qs.set('limit', '1000');
  if (search) qs.set('search', search);
  if (status !== 'all') qs.set('status', status);
  const res = await fetchWithAuth(`${API_BASE_URL}/subscriber?${qs}`);
  if (!res.ok) throw new Error('Không thể xuất CSV');
  const json = await res.json();
  const rows: Subscriber[] = Array.isArray(json?.data) ? json.data : [];
  const csv = [
    ['ID', 'Email', 'Trạng thái', 'Ngày đăng ký'].map(escapeCsv).join(','),
    ...rows.map(item => [
      item.id,
      item.email,
      item.isActive ? 'Đang nhận tin' : 'Đã tạm dừng',
      formatDate(item.createdAt),
    ].map(escapeCsv).join(',')),
  ].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `azure-horizon-nguoi-dang-ky-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
