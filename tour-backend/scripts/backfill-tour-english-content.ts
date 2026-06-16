import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { isUsableEnglishText } from '../src/tour/localization/translation-engine';
import { localizeTour } from '../src/tour/localization/entity-localizers';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL chưa được cấu hình. Vui lòng thiết lập trong file .env.');
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as never);
const prisma = new PrismaClient({ adapter });

const tourBackfillQuery = Prisma.validator<Prisma.TourFindManyArgs>()({
  include: {
    destination: true,
    itinerary: { orderBy: { dayNumber: 'asc' } },
    packages: { orderBy: { sortOrder: 'asc' } },
    departures: { orderBy: [{ sortOrder: 'asc' }, { departureDate: 'asc' }] },
    highlights: { orderBy: { sortOrder: 'asc' } },
    faqs: { orderBy: { sortOrder: 'asc' } },
  },
  orderBy: { id: 'asc' },
});

type BackfillTour = Prisma.TourGetPayload<typeof tourBackfillQuery>;
type LocalizedDestination = Record<string, unknown> & {
  name?: unknown;
  region?: unknown;
};
type LocalizedHighlight = Record<string, unknown> & { content?: unknown };
type LocalizedItineraryDay = Record<string, unknown> & {
  title?: unknown;
  description?: unknown;
  accommodation?: unknown;
  transport?: unknown;
  activities?: unknown;
  timeline?: unknown;
};
type LocalizedFaq = Record<string, unknown> & {
  question?: unknown;
  answer?: unknown;
};
type LocalizedPackage = Record<string, unknown> & {
  name?: unknown;
  description?: unknown;
  includes?: unknown;
  excludes?: unknown;
};
type LocalizedDeparture = Record<string, unknown> & { note?: unknown };
type LocalizedBackfillTour = Record<string, unknown> & {
  name?: unknown;
  description?: unknown;
  duration?: unknown;
  departurePoint?: unknown;
  destination?: LocalizedDestination;
  highlights?: LocalizedHighlight[];
  itinerary?: LocalizedItineraryDay[];
  faqs?: LocalizedFaq[];
  packages?: LocalizedPackage[];
  departures?: LocalizedDeparture[];
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const getTextArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter(hasText) : [];

const needsArrayPatch = (value: unknown) =>
  !Array.isArray(value) ||
  value.length === 0 ||
  !value.every(isUsableEnglishText);

const hasTimeline = (value: unknown): value is unknown[] =>
  Array.isArray(value) && value.length > 0;

const needsTimelinePatch = (value: unknown) =>
  !Array.isArray(value) ||
  value.length === 0 ||
  !value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    return isUsableEnglishText((item as Record<string, unknown>).activity);
  });

const patchIfBlank = (
  target: Record<string, unknown>,
  field: string,
  currentValue: unknown,
  fallbackValue: unknown,
) => {
  if (!isUsableEnglishText(currentValue) && isUsableEnglishText(fallbackValue)) {
    target[field] = fallbackValue;
  }
};

async function main() {
  const tours: BackfillTour[] = await prisma.tour.findMany(tourBackfillQuery);

  let patchedTours = 0;
  let patchedDestinations = 0;
  let patchedHighlights = 0;
  let patchedItinerary = 0;
  let patchedFaqs = 0;
  let patchedPackages = 0;
  let patchedDepartures = 0;

  for (const tour of tours) {
    const localized = localizeTour(
      tour as unknown as LocalizedBackfillTour,
      'en',
    );

    const tourData: Record<string, unknown> = {};
    patchIfBlank(tourData, 'nameEn', tour.nameEn, localized.name);
    patchIfBlank(tourData, 'descriptionEn', tour.descriptionEn, localized.description);
    patchIfBlank(tourData, 'durationEn', tour.durationEn, localized.duration);
    patchIfBlank(tourData, 'departurePointEn', tour.departurePointEn, localized.departurePoint);
    if (Object.keys(tourData).length > 0) {
      await prisma.tour.update({ where: { id: tour.id }, data: tourData });
      patchedTours += 1;
    }

    if (tour.destination) {
      const destinationData: Record<string, unknown> = {};
      patchIfBlank(
        destinationData,
        'nameEn',
        tour.destination.nameEn,
        localized.destination?.name,
      );
      patchIfBlank(
        destinationData,
        'regionEn',
        tour.destination.regionEn,
        localized.destination?.region,
      );
      if (Object.keys(destinationData).length > 0) {
        await prisma.destination.update({
          where: { id: tour.destination.id },
          data: destinationData,
        });
        patchedDestinations += 1;
      }
    }

    for (const [index, highlight] of tour.highlights.entries()) {
      const fallback = localized.highlights?.[index]?.content;
      if (!hasText(highlight.contentEn) && hasText(fallback)) {
        await prisma.tourHighlight.update({
          where: { id: highlight.id },
          data: { contentEn: fallback },
        });
        patchedHighlights += 1;
      }
    }

    for (const [index, day] of tour.itinerary.entries()) {
      const fallback = localized.itinerary?.[index];
      if (!fallback) continue;
      const data: Record<string, unknown> = {};
      patchIfBlank(data, 'titleEn', day.titleEn, fallback.title);
      patchIfBlank(data, 'descriptionEn', day.descriptionEn, fallback.description);
      patchIfBlank(data, 'accommodationEn', day.accommodationEn, fallback.accommodation);
      patchIfBlank(data, 'transportEn', day.transportEn, fallback.transport);
      const fallbackActivities = getTextArray(fallback.activities);
      if (needsArrayPatch(day.activitiesEn) && fallbackActivities.length > 0) {
        data.activitiesEn = fallbackActivities;
      }
      if (needsTimelinePatch(day.timelineEn) && hasTimeline(fallback.timeline)) {
        data.timelineEn = fallback.timeline;
      }
      if (Object.keys(data).length > 0) {
        await prisma.tourItinerary.update({ where: { id: day.id }, data });
        patchedItinerary += 1;
      }
    }

    for (const [index, faq] of tour.faqs.entries()) {
      const fallback = localized.faqs?.[index];
      if (!fallback) continue;
      const data: Record<string, unknown> = {};
      patchIfBlank(data, 'questionEn', faq.questionEn, fallback.question);
      patchIfBlank(data, 'answerEn', faq.answerEn, fallback.answer);
      if (Object.keys(data).length > 0) {
        await prisma.tourFAQ.update({ where: { id: faq.id }, data });
        patchedFaqs += 1;
      }
    }

    for (const [index, pkg] of tour.packages.entries()) {
      const fallback = localized.packages?.[index];
      if (!fallback) continue;
      const data: Record<string, unknown> = {};
      patchIfBlank(data, 'nameEn', pkg.nameEn, fallback.name);
      patchIfBlank(data, 'descriptionEn', pkg.descriptionEn, fallback.description);
      const fallbackIncludes = getTextArray(fallback.includes);
      if (needsArrayPatch(pkg.includesEn) && fallbackIncludes.length > 0) {
        data.includesEn = fallbackIncludes;
      }
      const fallbackExcludes = getTextArray(fallback.excludes);
      if (needsArrayPatch(pkg.excludesEn) && fallbackExcludes.length > 0) {
        data.excludesEn = fallbackExcludes;
      }
      if (Object.keys(data).length > 0) {
        await prisma.tourPackage.update({ where: { id: pkg.id }, data });
        patchedPackages += 1;
      }
    }

    for (const [index, departure] of tour.departures.entries()) {
      const fallback = localized.departures?.[index]?.note;
      if (!hasText(departure.noteEn) && hasText(fallback)) {
        await prisma.tourDeparture.update({
          where: { id: departure.id },
          data: { noteEn: fallback },
        });
        patchedDepartures += 1;
      }
    }
  }

  console.log(
    [
      `Backfilled English content for ${tours.length} tours.`,
      `Tours: ${patchedTours}`,
      `Destinations: ${patchedDestinations}`,
      `Highlights: ${patchedHighlights}`,
      `Itinerary days: ${patchedItinerary}`,
      `FAQs: ${patchedFaqs}`,
      `Packages: ${patchedPackages}`,
      `Departures: ${patchedDepartures}`,
    ].join('\n'),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
