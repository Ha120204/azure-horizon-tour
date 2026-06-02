ALTER TABLE "Voucher"
  ADD COLUMN "maxDiscountAmount" DOUBLE PRECISION,
  ADD COLUMN "usageLimitPerUser" INTEGER,
  ADD COLUMN "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "isStackable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "eligibleTourIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "eligibleDestinationIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "eligibleCustomerSegments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Voucher_startsAt_expiresAt_idx" ON "Voucher"("startsAt", "expiresAt");
