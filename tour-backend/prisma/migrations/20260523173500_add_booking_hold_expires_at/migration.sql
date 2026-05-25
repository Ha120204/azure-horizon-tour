-- Store the actual hold deadline per booking so expiration can follow the
-- selected payment method and departure date instead of a global timeout.
ALTER TABLE "Booking" ADD COLUMN "holdExpiresAt" TIMESTAMP(3);

UPDATE "Booking"
SET "holdExpiresAt" = CASE
  WHEN "paymentMethod" = 'IN_STORE' THEN "createdAt" + INTERVAL '24 hours'
  ELSE "createdAt" + INTERVAL '15 minutes'
END
WHERE "status" = 'PENDING'
  AND "paymentStatus" = 'UNPAID'
  AND "holdExpiresAt" IS NULL;

CREATE INDEX "Booking_status_paymentStatus_holdExpiresAt_idx"
ON "Booking"("status", "paymentStatus", "holdExpiresAt");
