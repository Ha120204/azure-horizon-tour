import type { SupportedLocale, UnknownRecord } from './types';
import {
  hasText,
  asRecord,
  arrayValue,
  recordValue,
  destinationNameValue,
  normalizeTextKey,
} from './text-utils';
import { REGION_FALLBACKS, PACKAGE_NAME_FALLBACKS, EXACT_TEXT_TRANSLATIONS, NAME_TRANSLATIONS } from './dictionaries';
import {
  toEnglishTextFallback,
  isUsableEnglishText,
  toEnglishNameFallback,
  toEnglishDurationFallback,
  toEnglishArrayFallback,
  toEnglishTimelineFallback,
} from './translation-engine';

const englishTourDescriptionFallback = (tour: UnknownRecord) => {
  const translated = toEnglishTextFallback(tour.description);
  if (translated && isUsableEnglishText(translated)) return translated;

  const tourName = toEnglishNameFallback(tour.name, 'This tour');
  const destinationName = toEnglishNameFallback(
    destinationNameValue(tour) ?? tour.departurePoint,
    'the destination',
  );
  const duration = toEnglishDurationFallback(tour.duration).toLowerCase();
  return `${tourName} is a ${duration} itinerary designed for travelers who want a smooth guided experience in ${destinationName}. The trip includes scheduled transportation, curated stops, local meal arrangements, pre-departure support, and package options for different budgets.`;
};

const englishItineraryDescriptionFallback = (day: UnknownRecord, tour: UnknownRecord) => {
  const translated = toEnglishTextFallback(day.description);
  if (translated && isUsableEnglishText(translated)) return translated;

  const activities = englishActivitiesFallback(day, tour).slice(0, 3);
  if (activities.length > 0) {
    return `Follow the planned route for this day, with ${activities.join(', ')} and scheduled meal or rest stops.`;
  }
  return 'Follow the planned route for this day with guided sightseeing and scheduled service stops.';
};

const englishAccommodationFallback = (value: unknown, tour: UnknownRecord) => {
  if (!hasText(value)) return '';
  const translated = toEnglishTextFallback(value);
  if (translated && isUsableEnglishText(translated)) return translated;

  const destinationName = toEnglishNameFallback(destinationNameValue(tour) ?? tour.name, 'destination');
  const raw = normalizeTextKey(value);
  if (raw.includes('resort') || raw.includes('nghi duong')) {
    return `${destinationName} hotel or resort by selected package`;
  }
  if (raw.includes('homestay') || raw.includes('nha san')) {
    return `${destinationName} homestay by selected package`;
  }
  return `${destinationName} hotel by selected package`;
};

const englishTransportFallback = (value: unknown) => {
  if (!hasText(value)) return '';
  const translated = toEnglishTextFallback(value);
  if (translated && isUsableEnglishText(translated)) return translated;

  const raw = normalizeTextKey(value);
  if (raw.includes('cap treo')) return 'Tourist vehicle and cable car depending on package';
  if (raw.includes('thuyen')) return 'Tourist vehicle and boat by itinerary';
  if (raw.includes('may bay') || raw.includes('bay')) return 'Flight and ground transfers by itinerary';
  if (raw.includes('xe rieng')) return 'Private vehicle by itinerary';
  return 'Scheduled tourist vehicle';
};

const englishTitleFallback = (day: UnknownRecord, tour: UnknownRecord) => {
  const translated = toEnglishTextFallback(day.title);
  if (translated && isUsableEnglishText(translated)) return translated;

  const destinationName = toEnglishNameFallback(destinationNameValue(tour) ?? tour.name, 'Destination');
  const dayNumber = Number(day.dayNumber ?? 0);
  if (dayNumber > 0) return `Day ${dayNumber}: ${destinationName} Highlights`;
  return `${destinationName} Highlights`;
};

const englishActivityItemFallback = (value: unknown) => {
  if (!hasText(value)) return '';

  const key = normalizeTextKey(value);
  const exact = EXACT_TEXT_TRANSLATIONS[key] ?? NAME_TRANSLATIONS[key];
  if (exact && isUsableEnglishText(exact)) return exact.replace(/[.!?]$/, '');

  const name = toEnglishNameFallback(value, '');
  if (name && isUsableEnglishText(name)) return name.replace(/[.!?]$/, '');

  const translated = toEnglishTextFallback(value);
  if (translated && isUsableEnglishText(translated)) return translated.replace(/[.!?]$/, '');

  return '';
};

const englishActivitiesFallback = (day: UnknownRecord, tour: UnknownRecord) => {
  const activitiesEn = arrayValue(day, 'activitiesEn');
  const activitiesVi = arrayValue(day, 'activities');
  const source =
    activitiesEn &&
    activitiesEn.length > 0 &&
    activitiesEn.every(isUsableEnglishText)
      ? activitiesEn
      : activitiesVi
        ? activitiesVi
        : [];

  const activities = source
    .map(englishActivityItemFallback)
    .filter(hasText)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 4);

  if (activities.length > 0) return activities;

  const destinationName = toEnglishNameFallback(destinationNameValue(tour) ?? tour.name, 'destination');
  return [
    `${destinationName} sightseeing`,
    'Local experience',
    'Scheduled meal stop',
  ];
};

const englishTimelineFallback = (day: UnknownRecord) => {
  const fallbackActivities = [
    'Guest pickup and departure',
    'Main sightseeing stop',
    'Lunch according to the itinerary',
    'Afternoon experience',
    'Dinner and rest',
  ];
  const source =
    arrayValue(day, 'timelineEn') && arrayValue(day, 'timelineEn')!.length > 0
      ? arrayValue(day, 'timelineEn')!
      : arrayValue(day, 'timeline')
        ? arrayValue(day, 'timeline')!
        : [];

  return source.map((item, index) => {
    const timelineItem = asRecord(item);
    if (!timelineItem) return { activity: 'Scheduled activity' };
    const fallback = fallbackActivities[index] ?? 'Scheduled activity';
    const translated = englishActivityItemFallback(timelineItem.activity) || fallback;
    return {
      ...timelineItem,
      activity: translated,
    };
  });
};

const englishHighlightFallback = (
  highlight: UnknownRecord,
  index: number,
  tour: UnknownRecord,
) => {
  const translated = toEnglishTextFallback(highlight.content);
  if (translated && isUsableEnglishText(translated)) return translated;

  const destinationName = toEnglishNameFallback(destinationNameValue(tour) ?? tour.name, 'the destination');
  const genericHighlights = [
    `Signature sightseeing in ${destinationName}`,
    'Local culture and scenic experiences',
    'Included meals or selected local specialties',
    'Guided itinerary with scheduled support',
  ];
  return genericHighlights[index % genericHighlights.length];
};

const englishFaqFallback = (faq: UnknownRecord, index: number, tour: UnknownRecord) => {
  const question = toEnglishTextFallback(faq.question);
  const answer = toEnglishTextFallback(faq.answer);
  if (question && answer && isUsableEnglishText(`${question} ${answer}`)) {
    return { question, answer };
  }

  const rawQuestionKey = normalizeTextKey(faq.question);
  if (rawQuestionKey.includes('visa')) {
    return {
      question: 'Do travelers need a visa for this tour?',
      answer:
        'Visa requirements depend on nationality and current entry rules. Our team will advise the required documents before confirmation.',
    };
  }
  if (rawQuestionKey.includes('tre em') || rawQuestionKey.includes('gia dinh')) {
    return {
      question: 'Is this tour suitable for families with children?',
      answer:
        'Yes, the itinerary is designed at a comfortable pace. Families should review the activity level and selected package before booking.',
    };
  }
  if (
    rawQuestionKey.includes('di bo') ||
    rawQuestionKey.includes('leo') ||
    rawQuestionKey.includes('trekking')
  ) {
    return {
      question: 'How demanding is the activity level?',
      answer:
        'The activity level depends on the route and selected stops. Guests should bring comfortable shoes and tell the team about any mobility concerns.',
    };
  }
  if (rawQuestionKey.includes('don') || rawQuestionKey.includes('khach san')) {
    return {
      question: 'Is hotel pickup available?',
      answer:
        'Pickup availability depends on the departure point and confirmed schedule. The team will confirm the exact time before departure.',
    };
  }

  const destinationName = toEnglishNameFallback(destinationNameValue(tour) ?? tour.name, 'this destination');
  const fallbacks = [
    {
      question: `What should I confirm before booking ${destinationName}?`,
      answer:
        'Final inclusions depend on the selected package and departure date. Please review the package details before payment.',
    },
    {
      question: 'Can the itinerary be adjusted?',
      answer:
        'Private and premium packages may allow more flexible timing, subject to supplier availability and seasonal conditions.',
    },
  ];
  return fallbacks[index % fallbacks.length];
};

const englishPackageNameFallback = (value: unknown, index?: number) => {
  const key = normalizeTextKey(value);
  return PACKAGE_NAME_FALLBACKS[key] ?? `Package ${index != null ? index + 1 : ''}`.trim();
};

const englishPackageDescriptionFallback = (pkg: UnknownRecord, index?: number) => {
  const translated = toEnglishTextFallback(pkg.description);
  if (translated && isUsableEnglishText(translated)) return translated;

  const packageName = englishPackageNameFallback(pkg.name, index).toLowerCase();
  if (packageName.includes('private')) {
    return 'Flexible private pacing with selected services for families or small groups.';
  }
  if (packageName.includes('premium')) {
    return 'Enhanced services for a more comfortable and complete journey.';
  }
  return 'Core services for a balanced and reliable tour experience.';
};

const englishDepartureNoteFallback = (departure: UnknownRecord) => {
  if (hasText(departure.note)) {
    const translated = toEnglishTextFallback(departure.note);
    if (translated && isUsableEnglishText(translated)) return translated;
  }
  const category = departure.category;
  if (category === 'FLASH_SALE') return 'Flash sale departure';
  if (category === 'EARLY_BIRD') return 'Early bird departure';
  if (category === 'LAST_MINUTE') return 'Last-minute departure';
  return 'Regular departure';
};

export const localizeDestination = <T extends UnknownRecord | null | undefined>(
  destination: T,
  locale: SupportedLocale,
): T => {
  if (!destination || locale !== 'en') return destination;
  return {
    ...destination,
    name: isUsableEnglishText(destination.nameEn)
      ? destination.nameEn
      : toEnglishNameFallback(destination.name, 'Destination'),
    region: isUsableEnglishText(destination.regionEn)
      ? destination.regionEn
      : (REGION_FALLBACKS[normalizeTextKey(destination.region)] ??
        toEnglishNameFallback(
          destination.region,
          hasText(destination.region) ? destination.region : 'Region',
        )),
  };
};

export const localizePackage = <T extends UnknownRecord>(
  pkg: T,
  locale: SupportedLocale,
  index?: number,
): T => {
  if (locale !== 'en') return pkg;
  return {
    ...pkg,
    name: isUsableEnglishText(pkg.nameEn) ? pkg.nameEn : englishPackageNameFallback(pkg.name, index),
    description: isUsableEnglishText(pkg.descriptionEn)
      ? pkg.descriptionEn
      : englishPackageDescriptionFallback(pkg, index),
    includes: toEnglishArrayFallback(pkg.includesEn, pkg.includes),
    excludes: toEnglishArrayFallback(pkg.excludesEn, pkg.excludes),
  };
};

export const localizeDeparture = <T extends UnknownRecord>(
  departure: T,
  locale: SupportedLocale,
): T => {
  if (locale !== 'en') return departure;
  return {
    ...departure,
    note: isUsableEnglishText(departure.noteEn)
      ? departure.noteEn
      : englishDepartureNoteFallback(departure),
  };
};

export const localizeTour = <T extends UnknownRecord>(
  tour: T,
  locale: SupportedLocale,
): T => {
  if (locale !== 'en') return tour;

  return {
    ...tour,
    name: isUsableEnglishText(tour.nameEn) ? tour.nameEn : toEnglishNameFallback(tour.name, 'Tour'),
    description: isUsableEnglishText(tour.descriptionEn)
      ? tour.descriptionEn
      : englishTourDescriptionFallback(tour),
    duration: isUsableEnglishText(tour.durationEn)
      ? tour.durationEn
      : toEnglishDurationFallback(tour.duration),
    departurePoint: isUsableEnglishText(tour.departurePointEn)
      ? tour.departurePointEn
      : toEnglishNameFallback(tour.departurePoint, 'Contact for details'),
    destination: localizeDestination(recordValue(tour, 'destination'), locale),
    itinerary: Array.isArray(tour.itinerary)
      ? tour.itinerary.map((rawDay) => {
          const day = asRecord(rawDay) ?? {};
          return {
            ...day,
            title: isUsableEnglishText(day.titleEn)
              ? day.titleEn
              : englishTitleFallback(day, tour),
            description: isUsableEnglishText(day.descriptionEn)
              ? day.descriptionEn
              : englishItineraryDescriptionFallback(day, tour),
            accommodation: isUsableEnglishText(day.accommodationEn)
              ? day.accommodationEn
              : englishAccommodationFallback(day.accommodation, tour),
            transport: isUsableEnglishText(day.transportEn)
              ? day.transportEn
              : englishTransportFallback(day.transport),
            activities: englishActivitiesFallback(day, tour),
            timeline: englishTimelineFallback(day),
          };
        })
      : tour.itinerary,
    highlights: Array.isArray(tour.highlights)
      ? tour.highlights.map((rawHighlight, index: number) => {
          const highlight = asRecord(rawHighlight) ?? {};
          return {
            ...highlight,
            content: isUsableEnglishText(highlight.contentEn)
              ? highlight.contentEn
              : englishHighlightFallback(highlight, index, tour),
          };
        })
      : tour.highlights,
    faqs: Array.isArray(tour.faqs)
      ? tour.faqs.map((rawFaq, index: number) => {
          const faq = asRecord(rawFaq) ?? {};
          const fallback = englishFaqFallback(faq, index, tour);
          return {
            ...faq,
            question: isUsableEnglishText(faq.questionEn) ? faq.questionEn : fallback.question,
            answer: isUsableEnglishText(faq.answerEn) ? faq.answerEn : fallback.answer,
          };
        })
      : tour.faqs,
    packages: Array.isArray(tour.packages)
      ? tour.packages.map((rawPkg, index: number) => {
          const pkg = asRecord(rawPkg) ?? {};
          return localizePackage(pkg, locale, index);
        })
      : tour.packages,
    departures: Array.isArray(tour.departures)
      ? tour.departures.map((rawDeparture) => {
          const departure = asRecord(rawDeparture) ?? {};
          return localizeDeparture(departure, locale);
        })
      : tour.departures,
  };
};
