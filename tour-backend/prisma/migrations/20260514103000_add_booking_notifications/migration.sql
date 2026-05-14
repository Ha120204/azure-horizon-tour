ALTER TABLE "AssistedBookingDraft"
ADD COLUMN "confirmationChannel" TEXT NOT NULL DEFAULT 'ZALO',
ADD COLUMN "emailForTicket" TEXT;

CREATE TABLE "BookingNotification" (
  "id" SERIAL NOT NULL,
  "bookingId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient" TEXT,
  "status" TEXT NOT NULL,
  "subject" TEXT,
  "content" TEXT NOT NULL,
  "paymentUrl" TEXT,
  "qrCodeUrl" TEXT,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingNotification_bookingId_type_createdAt_idx"
ON "BookingNotification"("bookingId", "type", "createdAt");

CREATE INDEX "BookingNotification_status_createdAt_idx"
ON "BookingNotification"("status", "createdAt");

ALTER TABLE "BookingNotification"
ADD CONSTRAINT "BookingNotification_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookingNotification"
ADD CONSTRAINT "BookingNotification_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
