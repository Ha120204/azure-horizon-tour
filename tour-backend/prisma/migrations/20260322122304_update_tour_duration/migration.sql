/*
  Warnings:

  - You are about to drop the column `endDate` on the `Tour` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tour" DROP COLUMN "endDate",
ADD COLUMN     "duration" TEXT NOT NULL DEFAULT 'Chưa xác định';
