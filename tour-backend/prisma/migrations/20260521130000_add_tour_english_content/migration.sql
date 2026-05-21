-- Add nullable English content fields for customer-facing tour localization.
ALTER TABLE "Destination" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "Destination" ADD COLUMN "regionEn" TEXT;

ALTER TABLE "Tour" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "Tour" ADD COLUMN "descriptionEn" TEXT;
ALTER TABLE "Tour" ADD COLUMN "durationEn" TEXT;
ALTER TABLE "Tour" ADD COLUMN "departurePointEn" TEXT;

ALTER TABLE "TourItinerary" ADD COLUMN "titleEn" TEXT;
ALTER TABLE "TourItinerary" ADD COLUMN "descriptionEn" TEXT;
ALTER TABLE "TourItinerary" ADD COLUMN "accommodationEn" TEXT;
ALTER TABLE "TourItinerary" ADD COLUMN "transportEn" TEXT;
ALTER TABLE "TourItinerary" ADD COLUMN "activitiesEn" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "TourItinerary" ADD COLUMN "timelineEn" JSONB;

ALTER TABLE "TourHighlight" ADD COLUMN "contentEn" TEXT;

ALTER TABLE "TourFAQ" ADD COLUMN "questionEn" TEXT;
ALTER TABLE "TourFAQ" ADD COLUMN "answerEn" TEXT;

ALTER TABLE "TourPackage" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "TourPackage" ADD COLUMN "descriptionEn" TEXT;
ALTER TABLE "TourPackage" ADD COLUMN "includesEn" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "TourPackage" ADD COLUMN "excludesEn" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "TourDeparture" ADD COLUMN "noteEn" TEXT;
