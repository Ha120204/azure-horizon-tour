-- Step 1: Create the Destination table
CREATE TABLE "Destination" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Destination_name_key" ON "Destination"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- Step 2: Populate Destination from existing Tour.destination values
INSERT INTO "Destination" ("name", "updatedAt")
SELECT DISTINCT "destination", CURRENT_TIMESTAMP
FROM "Tour"
WHERE "destination" IS NOT NULL AND "destination" != '';

-- Step 3: Add destinationId as nullable first
ALTER TABLE "Tour" ADD COLUMN "destinationId" INTEGER;

-- Step 4: Backfill destinationId from existing destination column
UPDATE "Tour" t
SET "destinationId" = d."id"
FROM "Destination" d
WHERE t."destination" = d."name";

-- Step 5: For any rows that didn't match, create a fallback destination
INSERT INTO "Destination" ("name", "updatedAt")
SELECT 'Chưa phân loại', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Destination" WHERE "name" = 'Chưa phân loại')
  AND EXISTS (SELECT 1 FROM "Tour" WHERE "destinationId" IS NULL);

UPDATE "Tour"
SET "destinationId" = (SELECT "id" FROM "Destination" WHERE "name" = 'Chưa phân loại')
WHERE "destinationId" IS NULL;

-- Step 6: Make destinationId required
ALTER TABLE "Tour" ALTER COLUMN "destinationId" SET NOT NULL;

-- Step 7: Drop the old destination text column
ALTER TABLE "Tour" DROP COLUMN "destination";

-- Step 8: Add foreign key
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
