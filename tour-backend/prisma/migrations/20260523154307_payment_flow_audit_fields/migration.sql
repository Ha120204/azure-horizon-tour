-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" INTEGER,
ADD COLUMN     "confirmedNote" TEXT,
ADD COLUMN     "confirmedSource" TEXT,
ADD COLUMN     "evidenceUrl" TEXT;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "bookingId" INTEGER;

-- CreateIndex
CREATE INDEX "PaymentTransaction_confirmedSource_confirmedAt_idx" ON "PaymentTransaction"("confirmedSource", "confirmedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_bookingId_idx" ON "SupportTicket"("bookingId");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
