-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedById" INTEGER,
ADD COLUMN     "status" "TourStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "Tour_status_createdAt_idx" ON "Tour"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Tour_createdById_status_idx" ON "Tour"("createdById", "status");

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
