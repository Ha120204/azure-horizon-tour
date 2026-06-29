const SENDER_NAME_EN: Record<string, string> = {
  'Nhân viên': 'Staff',
  'Khách hàng': 'Customer',
};

/** Subject lưu song ngữ dạng "Tiếng Việt / English" — hiển thị đúng nửa theo locale. */
export function localizeTicketSubject(subject: string, language: string): string {
  const parts = subject.split(' / ');
  if (parts.length !== 2) return subject;
  return language === 'en' ? parts[1] : parts[0];
}

/** Tên người gửi có thể là fallback mặc định tiếng Việt → dịch khi xem EN. */
export function localizeSenderName(name: string, language: string): string {
  if (language !== 'en') return name;
  return SENDER_NAME_EN[name] ?? name;
}
