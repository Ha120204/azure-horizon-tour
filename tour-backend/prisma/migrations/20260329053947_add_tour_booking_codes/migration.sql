/*
  Warnings:

  - A unique constraint covering the columns `[bookingCode]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tourCode]` on the table `Tour` will be added. If there are existing duplicate values, this will fail.
  - The required column `bookingCode` was added to the `Booking` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `tourCode` was added to the `Tour` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "tourCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingCode_key" ON "Booking"("bookingCode");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_tourCode_key" ON "Tour"("tourCode");
