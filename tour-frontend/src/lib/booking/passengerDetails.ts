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
  if (type === 'Child (4-11)' && (age < 4 || age > 11)) return `Trẻ em phải từ 4-11 tuổi. Tuổi hiện tại: ${age} tuổi.`;
  if (type === 'Infant (<4)' && age >= 4) return `Em bé phải dưới 4 tuổi. Tuổi hiện tại: ${age} tuổi.`;
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
  return formatDateBoundary(-3);
}

export function getPassengerMaxDate(type: PassengerType): string {
  if (type === 'Adult (12+)') return formatDateBoundary(-12);
  if (type === 'Child (4-11)') return formatDateBoundary(-4);
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
