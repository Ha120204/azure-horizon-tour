-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYOS', 'IN_STORE');

-- DropForeignKey
ALTER TABLE "AssistedBookingDraft" DROP CONSTRAINT "AssistedBookingDraft_tourId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "confirmedById" INTEGER,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PAYOS';

-- AlterTable
ALTER TABLE "SupportTicket" ALTER COLUMN "accessCode" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistedBookingDraft" ADD CONSTRAINT "AssistedBookingDraft_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;
