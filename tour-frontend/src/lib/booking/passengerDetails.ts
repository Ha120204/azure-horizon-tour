export type PassengerType = 'Adult (12+)' | 'Child (4-11)' | 'Infant (<4)';

export type PassengerIdentityType = 'CCCD' | 'PASSPORT' | 'BIRTH_CERT' | string;

export type PassengerDetailsLike = {
  type?: PassengerType | string;
  fullName?: string;
  dob?: string;
  gender?: string;
  identityType?: PassengerIdentityType;
  identityNo?: string;
  notes?: string;
};

type Translate = (key: string) => string;

export function calcPassengerAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function getPassengerAgeError(type: PassengerType, dob: string): string | null {
  if (!dob) return null;
  const age = calcPassengerAge(dob);
  if (age === null) return 'Ngày sinh không hợp lệ.';
  if (age < 0) return 'Ngày sinh không được là ngày trong tương lai.';
  if (type === 'Adult (12+)' && age < 12) return `Người lớn phải từ 12 tuổi trở lên. Tuổi hiện tại: ${age} tuổi.`;
  if (type === 'Child (4-11)' && (age < 2 || age > 11)) return `Trẻ em phải từ 2-11 tuổi. Tuổi hiện tại: ${age} tuổi.`;
  if (type === 'Infant (<4)' && age >= 2) return `Em bé phải dưới 2 tuổi. Tuổi hiện tại: ${age} tuổi.`;
  return null;
}

function formatDateBoundary(yearOffset: number) {
  const today = new Date();
  const year = today.getFullYear() + yearOffset;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPassengerMinDate(type: PassengerType): string {
  if (type === 'Adult (12+)') return formatDateBoundary(-120);
  if (type === 'Child (4-11)') return formatDateBoundary(-11);
  return formatDateBoundary(-2);
}

export function getPassengerMaxDate(type: PassengerType): string {
  if (type === 'Adult (12+)') return formatDateBoundary(-12);
  if (type === 'Child (4-11)') return formatDateBoundary(-2);
  return formatDateBoundary(0);
}

export function getPassengerNameError(name: string): string | null {
  if (!name.trim()) return null;
  if (name.trim().split(/\s+/).length < 2) return 'Vui lòng nhập đầy đủ họ và tên (ít nhất 2 từ).';
  if (/[0-9!@#$%^&*()_+=[\]{};':"\\|,.<>/?]/.test(name)) return 'Họ tên không được chứa số hoặc ký tự đặc biệt.';
  return null;
}

export function getPassengerIdentityDocTypes(type: PassengerType, t: Translate) {
  if (type === 'Infant (<4)') {
    return [
      { value: 'BIRTH_CERT', label: t('checkout.birthCertificate') },
      { value: 'PASSPORT', label: t('checkout.passport') },
    ];
  }

  return [
    { value: 'CCCD', label: t('checkout.citizenId') },
    { value: 'PASSPORT', label: t('checkout.passport') },
  ];
}

export function validatePassengerIdentityNo(idType: string, idNo: string, t: Translate): string | null {
  if (!idNo) return null;
  if (idType === 'CCCD' && !/^\d{12}$/.test(idNo)) return t('checkout.citizenIdError');
  if (idType === 'PASSPORT' && !/^[A-Za-z0-9]{6,15}$/.test(idNo)) return t('checkout.passportError');
  return null;
}

export function getPassengerAgeLabel(dob?: string, yearsOldLabel = 'tuổi') {
  const age = calcPassengerAge(dob ?? '');
  return age !== null ? `${age} ${yearsOldLabel}` : dob;
}

export function hasPassengerDetails(passenger: PassengerDetailsLike) {
  return Boolean(
    passenger.fullName?.trim() ||
    passenger.dob?.trim() ||
    passenger.gender?.trim() ||
    passenger.identityNo?.trim() ||
    passenger.notes?.trim()
  );
}

// ── "Dán từ Excel": tách & chuẩn hoá danh sách hành khách ──────────────────
// Copy từ Excel → cột tách bằng Tab; gõ tay → ngăn cách bằng dấu phẩy.

export type PastedPassengerRow = {
  fullName: string;
  dob: string;
  gender: string;
  identityType: string;
  identityNo: string;
};

function normalizePastedGender(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return '';
  if (['nam', 'male', 'm', 'boy'].includes(v)) return 'Male';
  if (['nữ', 'nu', 'female', 'f', 'girl'].includes(v)) return 'Female';
  return 'Other';
}

function normalizePastedDob(raw: string): string {
  const v = raw.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

function normalizePastedIdentityType(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return '';
  if (v.includes('passport') || v.includes('hộ chiếu') || v.includes('ho chieu')) return 'PASSPORT';
  if (v.includes('birth') || v.includes('khai sinh')) return 'BIRTH_CERT';
  return 'CCCD';
}

function isPastedHeaderLine(line: string): boolean {
  const l = line.toLowerCase();
  return (
    l.includes('họ tên') || l.includes('họ và tên') || l.includes('full name') ||
    l.includes('ngày sinh') || l.includes('giới tính') || l.includes('gender') || l.includes('dob')
  );
}

export function parsePastedPassengers(text: string): PastedPassengerRow[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  // Bỏ dòng tiêu đề nếu khách copy cả header từ file mẫu.
  if (lines.length > 0 && isPastedHeaderLine(lines[0])) lines.shift();
  return lines
    .map(line => {
      const cols = (line.includes('\t') ? line.split('\t') : line.split(',')).map(c => c.trim());
      const identityNo = cols[4] ?? '';
      return {
        fullName: cols[0] ?? '',
        dob: normalizePastedDob(cols[1] ?? ''),
        gender: normalizePastedGender(cols[2] ?? ''),
        identityType: cols[3] ? normalizePastedIdentityType(cols[3]) : (identityNo ? 'CCCD' : ''),
        identityNo,
      };
    });
}

/** Tải file mẫu (CSV, mở được bằng Excel) cho tính năng "Dán từ Excel". */
export function downloadPassengerTemplate() {
  const rows = [
    ['Họ và tên', 'Ngày sinh (dd/mm/yyyy)', 'Giới tính', 'Loại giấy tờ', 'Số giấy tờ'],
    ['Nguyễn Văn A', '01/02/1990', 'Nam', 'CCCD', '012345678901'],
    ['Trần Thị B', '15/08/1995', 'Nữ', 'Hộ chiếu', 'B1234567'],
  ];
  const bom = String.fromCharCode(0xFEFF); // Excel đọc đúng tiếng Việt
  const csv = bom + rows
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mau-thong-tin-hanh-khach.csv';
  link.click();
  URL.revokeObjectURL(url);
}
