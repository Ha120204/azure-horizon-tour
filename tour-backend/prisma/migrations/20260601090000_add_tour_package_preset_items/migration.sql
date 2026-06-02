-- CreateEnum
CREATE TYPE "TourPackagePresetType" AS ENUM ('INCLUDE', 'EXCLUDE');

-- CreateTable
CREATE TABLE "TourPackagePresetItem" (
    "id" SERIAL NOT NULL,
    "type" "TourPackagePresetType" NOT NULL,
    "label" TEXT NOT NULL,
    "normalizedLabel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourPackagePresetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TourPackagePresetItem_type_normalizedLabel_key" ON "TourPackagePresetItem"("type", "normalizedLabel");

-- CreateIndex
CREATE INDEX "TourPackagePresetItem_type_isActive_label_idx" ON "TourPackagePresetItem"("type", "isActive", "label");

-- AddForeignKey
ALTER TABLE "TourPackagePresetItem" ADD CONSTRAINT "TourPackagePresetItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
