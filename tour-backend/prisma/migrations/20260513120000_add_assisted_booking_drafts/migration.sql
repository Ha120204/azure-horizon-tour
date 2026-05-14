-- CreateEnum
CREATE TYPE "AssistedDraftStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'NEEDS_REVISION', 'REJECTED', 'CONVERTED');

-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "isAssistedBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "assistedDraftId" INTEGER;

-- CreateTable
CREATE TABLE "AssistedBookingDraft" (
  "id" SERIAL NOT NULL,
  "draftCode" TEXT NOT NULL,
  "status" "AssistedDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "customerId" INTEGER,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "customerPhone" TEXT,
  "sourceChannel" TEXT NOT NULL DEFAULT 'LIVE_CHAT',
  "sourceTicketId" INTEGER,
  "tourId" INTEGER NOT NULL,
  "packageId" INTEGER,
  "departureId" INTEGER,
  "numberOfPeople" INTEGER NOT NULL,
  "passengers" JSONB,
  "quotedPrice" DOUBLE PRECISION NOT NULL,
  "unitPriceAtDraft" DOUBLE PRECISION,
  "voucherCode" TEXT,
  "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "specialRequests" TEXT,
  "internalNote" TEXT,
  "createdByStaffId" INTEGER,
  "reviewedByAdminId" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "approvalNote" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AssistedBookingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssistedBookingDraft_draftCode_key" ON "AssistedBookingDraft"("draftCode");
CREATE UNIQUE INDEX "Booking_assistedDraftId_key" ON "Booking"("assistedDraftId");
CREATE INDEX "AssistedBookingDraft_status_createdAt_idx" ON "AssistedBookingDraft"("status", "createdAt");
CREATE INDEX "AssistedBookingDraft_createdByStaffId_status_idx" ON "AssistedBookingDraft"("createdByStaffId", "status");
CREATE INDEX "AssistedBookingDraft_sourceTicketId_idx" ON "AssistedBookingDraft"("sourceTicketId");

-- AddForeignKey
ALTER TABLE "AssistedBookingDraft" ADD CONSTRAINT "AssistedBookingDraft_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssistedBookingDraft" ADD CONSTRAINT "AssistedBookingDraft_sourceTicketId_fkey" FOREIGN KEY ("sourceTicketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssistedBookingDraft" ADD CONSTRAINT "AssistedBookingDraft_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssistedBookingDraft" ADD CONSTRAINT "AssistedBookingDraft_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssistedBookingDraft" ADD CONSTRAINT "AssistedBookingDraft_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assistedDraftId_fkey" FOREIGN KEY ("assistedDraftId") REFERENCES "AssistedBookingDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
