export const NEVER_EXPIRES_YEAR = 2099;

export const formatCurrency = (value: number | undefined | null): string => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numberValue);
};

export const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const isNeverExpires = (value?: string | null): boolean => {
  if (!value) return true;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getFullYear() >= NEVER_EXPIRES_YEAR;
};

export const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase();
};

export const formatIdList = (items?: number[] | null): string => (
  items && items.length > 0 ? items.join(', ') : 'Tất cả'
);

export const segmentLabels: Record<string, string> = {
  FIRST_TIME: 'Khách mới',
  RETURNING: 'Khách quay lại',
  SAVED_TO_WALLET: 'Đã lưu ví',
  ALL: 'Tất cả',
};

export const formatSegments = (items?: string[] | null): string => (
  items && items.length > 0
    ? items.map((item) => segmentLabels[item] ?? item).join(', ')
    : 'Tất cả'
);

export const bookingStatusLabels: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã chốt',
  CANCEL_REQUESTED: 'Chờ hủy',
  CANCELLED: 'Đã hủy',
};

export const paymentStatusLabels: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  UNPAID: { label: 'Chưa thanh toán', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  PROCESSING: { label: 'Đang xử lý', cls: 'bg-amber-50 text-amber-700 ring-amber-100' },
  FAILED: { label: 'Thất bại', cls: 'bg-red-50 text-red-700 ring-red-100' },
};

export const statusConfig = {
  active: {
    label: 'Đang hoạt động',
    gradient: 'linear-gradient(135deg, #0f4c81 0%, #1565C0 45%, #1E88E5 100%)',
  },
  expired: {
    label: 'Đã hết hạn',
    gradient: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
  },
  depleted: {
    label: 'Hết lượt dùng',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  },
  inactive: {
    label: 'Vô hiệu hóa',
    gradient: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
  },
  scheduled: {
    label: 'Chưa bắt đầu',
    gradient: 'linear-gradient(135deg, #0f5a8a 0%, #2563eb 100%)',
  },
};
