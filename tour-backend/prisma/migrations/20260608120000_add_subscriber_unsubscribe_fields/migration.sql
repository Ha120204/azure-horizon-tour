-- AlterTable
ALTER TABLE "Subscriber"
ADD COLUMN "unsubscribeToken" TEXT,
ADD COLUMN "unsubscribedAt" TIMESTAMP(3),
ADD COLUMN "unsubscribeReason" TEXT;

-- Backfill existing subscribers before enforcing uniqueness and required values.
UPDATE "Subscriber"
SET "unsubscribeToken" = gen_random_uuid()::text
WHERE "unsubscribeToken" IS NULL;

ALTER TABLE "Subscriber"
ALTER COLUMN "unsubscribeToken" SET NOT NULL,
ALTER COLUMN "unsubscribeToken" SET DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_unsubscribeToken_key" ON "Subscriber"("unsubscribeToken");
