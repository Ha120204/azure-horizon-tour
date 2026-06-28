-- Điểm quá cảnh cho chuyến bay nối chuyến (chiều đi và chiều về).
ALTER TABLE "TourDepartureTransport" ADD COLUMN "transitPoint" TEXT;
ALTER TABLE "TourDepartureTransport" ADD COLUMN "transitPointEn" TEXT;
ALTER TABLE "TourDepartureTransport" ADD COLUMN "returnTransitPoint" TEXT;
ALTER TABLE "TourDepartureTransport" ADD COLUMN "returnTransitPointEn" TEXT;
