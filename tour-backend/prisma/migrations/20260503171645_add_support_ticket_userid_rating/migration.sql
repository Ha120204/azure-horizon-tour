/*
  Warnings:

  - The `category` column on the `SupportTicket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `SupportTicket` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- DropIndex
DROP INDEX "SupportTicket_assignedStaffId_idx";

-- DropIndex
DROP INDEX "SupportTicket_status_createdAt_idx";

-- DropIndex
DROP INDEX "TicketReply_ticketId_createdAt_idx";

-- DropIndex
DROP INDEX "Tour_createdById_status_idx";

-- DropIndex
DROP INDEX "Tour_status_createdAt_idx";

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedById" INTEGER,
ADD COLUMN     "status" "ArticleStatus" NOT NULL DEFAULT 'PUBLISHED',
ALTER COLUMN "publishedAt" DROP NOT NULL,
ALTER COLUMN "publishedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "customerPhone" DROP NOT NULL,
DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'general',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "Tour" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';

-- DropEnum
DROP TYPE "TicketCategory";

-- DropEnum
DROP TYPE "TicketStatus";

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "TicketReply_ticketId_idx" ON "TicketReply"("ticketId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
