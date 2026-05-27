type LocalizedVoucherText = {
  label?: string | null;
  labelEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
};

function pickLocalizedText(primary?: string | null, fallback?: string | null) {
  return primary && primary.trim() ? primary : fallback;
}

export function getLocalizedVoucher<T extends LocalizedVoucherText | null | undefined>(
  voucher: T,
  language: string,
): T {
  if (!voucher || language !== 'en') return voucher;

  return {
    ...voucher,
    label: pickLocalizedText(voucher.labelEn, voucher.label) ?? voucher.label,
    description: pickLocalizedText(voucher.descriptionEn, voucher.description) ?? voucher.description,
  } as T;
}
