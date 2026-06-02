export const NEVER_YEAR = 2099;

export const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  active:   { label: 'Hoạt động',    dot: 'bg-tertiary',  text: 'text-tertiary' },
  scheduled: { label: 'Chưa bắt đầu', dot: 'bg-primary', text: 'text-primary' },
  expired:  { label: 'Hết hạn',      dot: 'bg-outline',   text: 'text-outline' },
  depleted: { label: 'Hết lượt',     dot: 'bg-error',     text: 'text-error' },
  inactive: { label: 'Vô hiệu hóa', dot: 'bg-secondary', text: 'text-secondary' },
};

export const typeConfig: Record<string, { label: string; cls: string }> = {
  PERCENTAGE:   { label: 'Phần trăm',  cls: 'bg-primary/10 text-primary' },
  FIXED_AMOUNT: { label: 'Số tiền cố định', cls: 'bg-secondary/10 text-secondary' },
};
