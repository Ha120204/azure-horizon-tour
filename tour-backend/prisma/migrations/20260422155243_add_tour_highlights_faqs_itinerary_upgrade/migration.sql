-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "contactInfo" JSONB,
ADD COLUMN     "departureId" INTEGER,
ADD COLUMN     "packageId" INTEGER,
ADD COLUMN     "passengers" JSONB;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "adminReply" TEXT,
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "departurePoint" TEXT;

-- AlterTable
ALTER TABLE "TourItinerary" ADD COLUMN     "accommodation" TEXT,
ADD COLUMN     "activities" TEXT[],
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "mealsBreakfast" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mealsDinner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mealsLunch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timeline" JSONB,
ADD COLUMN     "transport" TEXT;

-- CreateTable
CREATE TABLE "TourHighlight" (
    "id" SERIAL NOT NULL,
    "tourId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'auto_awesome',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TourHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourFAQ" (
    "id" SERIAL NOT NULL,
    "tourId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TourFAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourImage" (
    "id" SERIAL NOT NULL,
    "tourId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TourImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourPackage" (
    "id" SERIAL NOT NULL,
    "tourId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "badge" TEXT,
    "includes" TEXT[],
    "excludes" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourDeparture" (
    "id" SERIAL NOT NULL,
    "tourId" INTEGER NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION,
    "availableSeats" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourDeparture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TourHighlight_tourId_sortOrder_idx" ON "TourHighlight"("tourId", "sortOrder");

-- CreateIndex
CREATE INDEX "TourFAQ_tourId_sortOrder_idx" ON "TourFAQ"("tourId", "sortOrder");

-- CreateIndex
CREATE INDEX "TourImage_tourId_sortOrder_idx" ON "TourImage"("tourId", "sortOrder");

-- CreateIndex
CREATE INDEX "TourPackage_tourId_sortOrder_idx" ON "TourPackage"("tourId", "sortOrder");

-- CreateIndex
CREATE INDEX "TourDeparture_tourId_departureDate_idx" ON "TourDeparture"("tourId", "departureDate");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "Review_isHidden_idx" ON "Review"("isHidden");

-- AddForeignKey
ALTER TABLE "TourHighlight" ADD CONSTRAINT "TourHighlight_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourFAQ" ADD CONSTRAINT "TourFAQ_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourImage" ADD CONSTRAINT "TourImage_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPackage" ADD CONSTRAINT "TourPackage_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourDeparture" ADD CONSTRAINT "TourDeparture_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
