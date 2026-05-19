CREATE TYPE "TravelScope" AS ENUM ('DOMESTIC', 'INTERNATIONAL');

ALTER TABLE "Destination"
ADD COLUMN "travelScope" "TravelScope" NOT NULL DEFAULT 'DOMESTIC',
ADD COLUMN "countryCode" TEXT;

UPDATE "Destination"
SET "countryCode" = 'VN'
WHERE "countryCode" IS NULL;

UPDATE "Destination"
SET
  "travelScope" = 'INTERNATIONAL',
  "countryCode" = CASE
    WHEN lower("name") LIKE '%tokyo%' OR lower("name") LIKE '%kyoto%' OR lower("name") LIKE '%osaka%' OR lower("name") LIKE '%japan%' OR "name" LIKE '%Nhật%' THEN 'JP'
    WHEN lower("name") LIKE '%seoul%' OR lower("name") LIKE '%jeju%' OR lower("name") LIKE '%korea%' OR "name" LIKE '%Hàn%' THEN 'KR'
    WHEN lower("name") LIKE '%bangkok%' OR lower("name") LIKE '%phuket%' OR lower("name") LIKE '%chiang mai%' OR lower("name") LIKE '%thailand%' OR "name" LIKE '%Thái%' THEN 'TH'
    WHEN lower("name") LIKE '%singapore%' THEN 'SG'
    WHEN lower("name") LIKE '%bali%' OR lower("name") LIKE '%indonesia%' THEN 'ID'
    WHEN lower("name") LIKE '%paris%' OR lower("name") LIKE '%france%' OR "name" LIKE '%Pháp%' THEN 'FR'
    WHEN lower("name") LIKE '%rome%' OR lower("name") LIKE '%venice%' OR lower("name") LIKE '%italy%' OR "name" LIKE '%Ý%' THEN 'IT'
    WHEN lower("name") LIKE '%london%' OR lower("name") LIKE '%england%' OR lower("name") LIKE '%uk%' OR "name" LIKE '%Anh%' THEN 'GB'
    WHEN lower("name") LIKE '%swiss%' OR lower("name") LIKE '%zurich%' OR "name" LIKE '%Thụy Sĩ%' THEN 'CH'
    ELSE NULL
  END
WHERE
  lower(coalesce("region", '')) NOT LIKE '%việt nam%'
  AND lower(coalesce("region", '')) NOT LIKE '%vietnam%'
  AND (
    lower(coalesce("region", '')) IN ('asia', 'europe', 'americas', 'africa', 'oceania', 'châu á', 'châu âu', 'châu mỹ', 'châu phi', 'châu đại dương')
    OR lower("name") LIKE ANY (ARRAY[
      '%tokyo%', '%kyoto%', '%osaka%', '%japan%',
      '%seoul%', '%jeju%', '%korea%',
      '%bangkok%', '%phuket%', '%chiang mai%', '%thailand%',
      '%singapore%', '%bali%', '%indonesia%',
      '%paris%', '%france%', '%rome%', '%venice%', '%italy%',
      '%london%', '%england%', '%swiss%', '%zurich%'
    ])
    OR "name" LIKE ANY (ARRAY['%Nhật%', '%Hàn%', '%Thái%', '%Pháp%', '%Thụy Sĩ%'])
  );

CREATE INDEX "Destination_travelScope_idx" ON "Destination"("travelScope");
