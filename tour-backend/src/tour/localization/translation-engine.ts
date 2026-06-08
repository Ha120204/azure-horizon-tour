import type { UnknownRecord } from './types';
import {
  hasText,
  asRecord,
  normalizeTextKey,
  stripVietnameseMarks,
  cleanSpaces,
  sentenceCase,
  withPeriod,
} from './text-utils';
import {
  TOUR_NAME_TRANSLATIONS,
  NAME_TRANSLATIONS,
  EXACT_TEXT_TRANSLATIONS,
  PHRASE_TRANSLATIONS,
  DAY_NIGHT_LABELS,
} from './dictionaries';

const translateNameValue = (value: unknown, fallback = 'Tour') => {
  const key = normalizeTextKey(value);
  if (TOUR_NAME_TRANSLATIONS[key]) return TOUR_NAME_TRANSLATIONS[key];
  if (NAME_TRANSLATIONS[key]) return NAME_TRANSLATIONS[key];

  let text = stripVietnameseMarks(value).trim();
  if (!text) return fallback;

  text = text
    .replace(/\bTP\.?\s*HCM\b/gi, 'Ho Chi Minh City')
    .replace(/\bHa Noi\b/gi, 'Hanoi')
    .replace(/\bHa Long\b/gi, 'Ha Long Bay')
    .replace(/\bThai Lan\b/gi, 'Thailand')
    .replace(/\bHan Quoc\b/gi, 'South Korea')
    .replace(/\bNhat Ban\b/gi, 'Japan')
    .replace(/\bDai Loan\b/gi, 'Taiwan')
    .replace(/\bDai Bac\b/gi, 'Taipei')
    .replace(/\bDai Trung\b/gi, 'Taichung')
    .replace(/\bCao Hung\b/gi, 'Kaohsiung')
    .replace(/\bChau Au\b/gi, 'Europe')
    .replace(/\bCo Do\b/gi, 'Ancient Capital')
    .replace(/\bDia Dao\b/gi, 'Tunnels')
    .replace(/\bDen\b/gi, 'Temple')
    .replace(/\bNghi Duong Bien\b/gi, 'Beach Retreat')
    .replace(/\bBien Dao\b/gi, 'Islands and Beaches')
    .replace(/\b(\d+)\s*Ngay\s*(\d+)\s*Dem\b/gi, (_, days, nights) => {
      const dayLabel = Number(days) === 1 ? DAY_NIGHT_LABELS.ngay : `${DAY_NIGHT_LABELS.ngay}s`;
      const nightLabel =
        Number(nights) === 1 ? DAY_NIGHT_LABELS.dem : `${DAY_NIGHT_LABELS.dem}s`;
      return `${days} ${dayLabel} ${nights} ${nightLabel}`;
    })
    .replace(/\b(\d+)\s*Ngay\b/gi, (_, days) => {
      const dayLabel = Number(days) === 1 ? DAY_NIGHT_LABELS.ngay : `${DAY_NIGHT_LABELS.ngay}s`;
      return `${days} ${dayLabel}`;
    });

  return cleanSpaces(text) || fallback;
};

export const toEnglishTextFallback = (value: unknown, fallback = ''): string => {
  if (!hasText(value)) return fallback;
  const raw = value.trim();

  if (/\n/.test(raw)) {
    const paragraphs = raw
      .split(/\n+/)
      .map((paragraph) => toEnglishTextFallback(paragraph))
      .filter(hasText);
    return paragraphs.join('\n\n') || fallback;
  }

  const key = normalizeTextKey(raw);
  const exact = EXACT_TEXT_TRANSLATIONS[key] ?? TOUR_NAME_TRANSLATIONS[key] ?? NAME_TRANSLATIONS[key];
  if (exact) return exact;

  let text = key;
  for (const [pattern, replacement] of PHRASE_TRANSLATIONS) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/\b(\d+)\s*ngay\s*(\d+)\s*dem\b/g, (_, days, nights) => {
      const dayLabel = Number(days) === 1 ? 'day' : 'days';
      const nightLabel = Number(nights) === 1 ? 'night' : 'nights';
      return `${days} ${dayLabel} ${nights} ${nightLabel}`;
    })
    .replace(/\b(\d+)\s*ngay\b/g, (_, days) => `${days} ${Number(days) === 1 ? 'day' : 'days'}`);

  text = text
    .replace(/\bva\b/g, 'and')
    .replace(/\bhoac\b/g, 'or')
    .replace(/\bvoi\b/g, 'with')
    .replace(/\btai\b/g, 'at')
    .replace(/\btu\b/g, 'from')
    .replace(/\bden\b/g, 'to')
    .replace(/\btrong\b/g, 'in')
    .replace(/\btren\b/g, 'on')
    .replace(/\bgiua\b/g, 'among')
    .replace(/\bcua\b/g, 'of')
    .replace(/\bcac\b/g, '')
    .replace(/\bdiem\b/g, 'sites')
    .replace(/\bkhu vuc\b/g, 'area')
    .replace(/\bchu yeu\b/g, 'mainly')
    .replace(/\bvan\b/g, 'still')
    .replace(/\bneu\b/g, 'if')
    .replace(/\btheo\b/g, 'by');

  const translated = sentenceCase(text);
  return translated ? withPeriod(translated) : fallback;
};

const looksWeakEnglish = (value: string) => {
  const key = value.toLowerCase();
  return (
    /\b(khach|hanh trinh|lich trinh|du khach|bua|diem|chuong trinh|phuong tien|vung|nhip|nghi|dung|dac san|khoi hanh|tham quan|mua dac san|tien khach|chinh phuc|tim hieu|thuong thuc|trung tam|noi bat|phu hop|dich vu|goi|quy dinh|san pham|thuc te|mac dinh|seed|chua|ngam|ngan|han che|chuan bi|cung|deo|khong gian|thap|nha tho|pho di bo|dia phuong|cao nguyen|miet vuon|ban lang|ruong|kenh|my pham|nhan sam|phan khuc|tuyen tour|not yet|still|tuyen pho|quang cave|hoat cave|ngoai troi|khu thuong mai|dai lo|rung tre|ve dem|lich su|truoc khi|ket thuc|ban island|mot ngay|tam beach|tam bien|lien tuyen|quoc gia|khu marina|khu hakone|sites landmarks|sites photo|ho guom|am thuc)\b/.test(
      key,
    ) ||
    /^vietnam\s+[a-z]+/.test(key) ||
    /\b(to|from|at|with|by|or)\s+(ulun|not|giam|goi)\b/.test(key) ||
    /\bseafood\s+(phu|binh|nha|quy)\b/.test(key) ||
    /\bcuisine\s+(hanoi|da nang|and shopping)\b/.test(key) ||
    /\b(ca phe|bun cha|free time explore|beach resort pickup)\b/.test(key) ||
    /\b(hotel|resort|homestay)\s+[a-z]+ by goi\b/.test(key) ||
    /\bcuisine\s+(ha|phu|quang|nha|hue|bali|japan|kansai|south)\b/.test(key) ||
    /\bbeach\s+(my|phu|nha|quy|center)\b/.test(key) ||
    /\bcity tour\s+(tokyo|seoul|hong|paris|taipei)\b/.test(key) ||
    /\b[A-Z]?[a-z]+\s+sapa\b/.test(value)
  );
};

export const isUsableEnglishText = (value: unknown): value is string =>
  hasText(value) && !looksWeakEnglish(value);

export const toEnglishNameFallback = translateNameValue;

export const toEnglishDurationFallback = (value: unknown) => {
  const normalized = normalizeTextKey(value);
  const dayNight = normalized.match(/^(\d+)\s*ngay\s*(\d+)\s*dem$/);
  if (dayNight) {
    return `${dayNight[1]} ${dayNight[1] === '1' ? 'Day' : 'Days'} ${dayNight[2]} ${
      dayNight[2] === '1' ? 'Night' : 'Nights'
    }`;
  }
  const daysOnly = normalized.match(/^(\d+)\s*ngay$/);
  if (daysOnly) {
    return `${daysOnly[1]} ${daysOnly[1] === '1' ? 'Day' : 'Days'}`;
  }
  return translateNameValue(value, 'Contact for duration');
};

export const toEnglishArrayFallback = (primary: unknown, fallback: unknown) => {
  if (
    Array.isArray(primary) &&
    primary.length > 0 &&
    primary.every(isUsableEnglishText)
  ) {
    return primary.filter(isUsableEnglishText);
  }
  if (!Array.isArray(fallback)) return [];
  return fallback
    .map((item) => {
      const translated = toEnglishTextFallback(item);
      return translated && !looksWeakEnglish(translated)
        ? translated
        : translateNameValue(item, '');
    })
    .filter(hasText);
};

export const toEnglishTimelineFallback = (primary: unknown, fallback: unknown) => {
  const hasPrimary = Array.isArray(primary) && primary.length > 0;
  const source = hasPrimary ? primary : Array.isArray(fallback) ? fallback : [];
  return source.map((item) => {
    const timelineItem = asRecord(item);
    if (!timelineItem) return { activity: 'Scheduled activity' };
    const activity = hasPrimary && isUsableEnglishText(timelineItem.activity)
      ? timelineItem.activity
      : toEnglishTextFallback(timelineItem.activity);
    return {
      ...timelineItem,
      activity: isUsableEnglishText(activity) ? activity : 'Scheduled activity',
    };
  });
};
