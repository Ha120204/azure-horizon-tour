/*
  Warnings:

  - You are about to drop the column `title` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `travelType` on the `Review` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Review" DROP COLUMN "title",
DROP COLUMN "travelType";
