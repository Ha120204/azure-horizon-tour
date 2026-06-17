import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { isUsableEnglishText } from '../src/tour/localization/translation-engine';
import { localizeTour } from '../src/tour/localization/entity-localizers';
import {
  AiTranslationService,
  type TourTranslationRequest,
  type TourTranslationResponse,
} from '../src/ai/ai-translation.service';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL chưa được cấu hình. Vui lòng thiết lập trong file .env.');
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as never);
const prisma = new PrismaClient({ adapter });

const parseLimit = (): number | undefined => {
  const arg = process.argv.find((value) => value.startsWith('--limit='));
  if (!arg) return undefined;
  const parsed = Number(arg.split('=')[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
};

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

// Ưu tiên bản dịch AI; chỉ rơi về bản từ điển khi AI thiếu/không dùng được.
const preferAi = (aiValue: unknown, dictionaryValue: unknown): unknown =>
  isUsableEnglishText(aiValue) ? aiValue : dictionaryValue;

const preferAiArray = (aiValue: unknown, dictionaryValue: unknown): unknown => {
  const ai = Array.isArray(aiValue) ? aiValue.filter(isUsableEnglishText) : [];
  return ai.length > 0 ? ai : dictionaryValue;
};

const preferAiTimeline = (aiValue: unknown, dictionaryValue: unknown): unknown =>
  hasTimeline(aiValue) ? aiValue : dictionaryValue;

const byIndex = <T extends { index?: number }>(items?: T[]): Map<number, T> => {
  const map = new Map<number, T>();
  (items ?? []).forEach((item, position) => map.set(item.index ?? position, item));
  return map;
};

function buildTranslationRequest(tour: BackfillTour): TourTranslationRequest {
  return {
    name: tour.name,
    description: tour.description,
    departurePoint: tour.departurePoint ?? undefined,
    duration: tour.duration,
    packages: tour.packages.map((pkg, index) => ({
      index,
      name: pkg.name,
      description: pkg.description ?? undefined,
      includes: pkg.includes,
      excludes: pkg.excludes,
    })),
    departures: tour.departures.map((departure, index) => ({
      index,
      note: departure.note ?? undefined,
    })),
    highlights: tour.highlights.map((highlight, index) => ({
      index,
      content: highlight.content,
    })),
    faqs: tour.faqs.map((faq, index) => ({
      index,
      question: faq.question,
      answer: faq.answer,
    })),
    itinerary: tour.itinerary.map((day, index) => ({
      index,
      title: day.title,
      description: day.description,
      accommodation: day.accommodation ?? undefined,
      transport: day.transport ?? undefined,
      activities: day.activities,
      timeline: Array.isArray(day.timeline)
        ? (day.timeline as { time?: string; activity?: string }[])
        : undefined,
    })),
  };
}

// Cần dịch khi tour-level HOẶC bất kỳ nội dung con nào còn thiếu bản EN.
// Nhờ vậy sau khi seed lại (xóa & tạo lại itinerary/package...) backfill vẫn refill đúng.
function needsTranslation(tour: BackfillTour): boolean {
  return (
    !isUsableEnglishText(tour.nameEn) ||
    tour.itinerary.some((day) => !isUsableEnglishText(day.titleEn)) ||
    tour.packages.some((pkg) => !isUsableEnglishText(pkg.nameEn)) ||
    tour.highlights.some((highlight) => !isUsableEnglishText(highlight.contentEn)) ||
    tour.faqs.some((faq) => !isUsableEnglishText(faq.questionEn))
  );
}

function createTranslationService(): AiTranslationService | null {
  try {
    return new AiTranslationService(new ConfigService());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[AI] Bỏ qua dịch AI (chỉ dùng từ điển): ${message}`,
    );
    return null;
  }
}

async function main() {
  const limit = parseLimit();
  const tours: BackfillTour[] = await prisma.tour.findMany({
    ...tourBackfillQuery,
    ...(limit ? { take: limit } : {}),
  });
  const aiService = createTranslationService();
  let aiTranslatedTours = 0;
  let aiFailedTours = 0;

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

    // Chỉ gọi AI khi tour chưa có bản tiếng Anh tốt → tiết kiệm token khi chạy lại.
    let ai: TourTranslationResponse | undefined;
    if (aiService && needsTranslation(tour)) {
      try {
        ai = await aiService.translateTourDraft(buildTranslationRequest(tour));
        aiTranslatedTours += 1;
      } catch (error) {
        aiFailedTours += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[AI] ${tour.tourCode}: dùng từ điển fallback — ${message}`);
      }
    }
    const aiPackages = byIndex(ai?.packages);
    const aiDepartures = byIndex(ai?.departures);
    const aiHighlights = byIndex(ai?.highlights);
    const aiFaqs = byIndex(ai?.faqs);
    const aiItinerary = byIndex(ai?.itinerary);

    const tourData: Record<string, unknown> = {};
    patchIfBlank(tourData, 'nameEn', tour.nameEn, preferAi(ai?.nameEn, localized.name));
    patchIfBlank(tourData, 'descriptionEn', tour.descriptionEn, preferAi(ai?.descriptionEn, localized.description));
    patchIfBlank(tourData, 'durationEn', tour.durationEn, preferAi(ai?.durationEn, localized.duration));
    patchIfBlank(tourData, 'departurePointEn', tour.departurePointEn, preferAi(ai?.departurePointEn, localized.departurePoint));
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
      const fallback = preferAi(
        aiHighlights.get(index)?.contentEn,
        localized.highlights?.[index]?.content,
      );
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
      const aiDay = aiItinerary.get(index);
      if (!fallback && !aiDay) continue;
      const data: Record<string, unknown> = {};
      patchIfBlank(data, 'titleEn', day.titleEn, preferAi(aiDay?.titleEn, fallback?.title));
      patchIfBlank(data, 'descriptionEn', day.descriptionEn, preferAi(aiDay?.descriptionEn, fallback?.description));
      patchIfBlank(data, 'accommodationEn', day.accommodationEn, preferAi(aiDay?.accommodationEn, fallback?.accommodation));
      patchIfBlank(data, 'transportEn', day.transportEn, preferAi(aiDay?.transportEn, fallback?.transport));
      const fallbackActivities = preferAiArray(aiDay?.activitiesEn, getTextArray(fallback?.activities));
      if (needsArrayPatch(day.activitiesEn) && Array.isArray(fallbackActivities) && fallbackActivities.length > 0) {
        data.activitiesEn = fallbackActivities;
      }
      const fallbackTimeline = preferAiTimeline(aiDay?.timelineEn, fallback?.timeline);
      if (needsTimelinePatch(day.timelineEn) && hasTimeline(fallbackTimeline)) {
        data.timelineEn = fallbackTimeline;
      }
      if (Object.keys(data).length > 0) {
        await prisma.tourItinerary.update({ where: { id: day.id }, data });
        patchedItinerary += 1;
      }
    }

    for (const [index, faq] of tour.faqs.entries()) {
      const fallback = localized.faqs?.[index];
      const aiFaq = aiFaqs.get(index);
      if (!fallback && !aiFaq) continue;
      const data: Record<string, unknown> = {};
      patchIfBlank(data, 'questionEn', faq.questionEn, preferAi(aiFaq?.questionEn, fallback?.question));
      patchIfBlank(data, 'answerEn', faq.answerEn, preferAi(aiFaq?.answerEn, fallback?.answer));
      if (Object.keys(data).length > 0) {
        await prisma.tourFAQ.update({ where: { id: faq.id }, data });
        patchedFaqs += 1;
      }
    }

    for (const [index, pkg] of tour.packages.entries()) {
      const fallback = localized.packages?.[index];
      const aiPkg = aiPackages.get(index);
      if (!fallback && !aiPkg) continue;
      const data: Record<string, unknown> = {};
      patchIfBlank(data, 'nameEn', pkg.nameEn, preferAi(aiPkg?.nameEn, fallback?.name));
      patchIfBlank(data, 'descriptionEn', pkg.descriptionEn, preferAi(aiPkg?.descriptionEn, fallback?.description));
      const fallbackIncludes = preferAiArray(aiPkg?.includesEn, getTextArray(fallback?.includes));
      if (needsArrayPatch(pkg.includesEn) && Array.isArray(fallbackIncludes) && fallbackIncludes.length > 0) {
        data.includesEn = fallbackIncludes;
      }
      const fallbackExcludes = preferAiArray(aiPkg?.excludesEn, getTextArray(fallback?.excludes));
      if (needsArrayPatch(pkg.excludesEn) && Array.isArray(fallbackExcludes) && fallbackExcludes.length > 0) {
        data.excludesEn = fallbackExcludes;
      }
      if (Object.keys(data).length > 0) {
        await prisma.tourPackage.update({ where: { id: pkg.id }, data });
        patchedPackages += 1;
      }
    }

    for (const [index, departure] of tour.departures.entries()) {
      const fallback = preferAi(
        aiDepartures.get(index)?.noteEn,
        localized.departures?.[index]?.note,
      );
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
      `AI dịch: ${aiTranslatedTours} | AI lỗi (fallback từ điển): ${aiFailedTours}`,
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
