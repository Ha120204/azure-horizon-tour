-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "refundBankDetails" JSONB,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
