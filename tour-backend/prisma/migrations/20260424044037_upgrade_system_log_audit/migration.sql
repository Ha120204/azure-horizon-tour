/*
  Warnings:

  - You are about to drop the column `adminId` on the `SystemLog` table. All the data in the column will be lost.
  - Added the required column `resource` to the `SystemLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SystemLog" DROP COLUMN "adminId",
ADD COLUMN     "newData" JSONB,
ADD COLUMN     "oldData" JSONB,
ADD COLUMN     "resource" TEXT NOT NULL,
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "targetName" TEXT,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "userId" INTEGER;

-- CreateIndex
CREATE INDEX "SystemLog_action_createdAt_idx" ON "SystemLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_userId_createdAt_idx" ON "SystemLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_resource_resourceId_idx" ON "SystemLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
