-- Bring the local database back in line with the current Prisma schema without
-- resetting data. These fields existed in schema.prisma but were missing from
-- the actual development database.

ALTER TYPE "TourStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "identityType" TEXT,
ADD COLUMN IF NOT EXISTS "identityNo" TEXT;

ALTER TABLE "SupportTicket"
ADD COLUMN IF NOT EXISTS "accessCode" TEXT;

UPDATE "SupportTicket"
SET "accessCode" = gen_random_uuid()::text
WHERE "accessCode" IS NULL;

ALTER TABLE "SupportTicket"
ALTER COLUMN "accessCode" SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_accessCode_key" ON "SupportTicket"("accessCode");

ALTER TABLE "TourDeparture"
ADD COLUMN IF NOT EXISTS "category" TEXT,
ADD COLUMN IF NOT EXISTS "flashSaleEndsAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "maxSeats" INTEGER;

CREATE INDEX IF NOT EXISTS "TourDeparture_category_flashSaleEndsAt_idx" ON "TourDeparture"("category", "flashSaleEndsAt");
