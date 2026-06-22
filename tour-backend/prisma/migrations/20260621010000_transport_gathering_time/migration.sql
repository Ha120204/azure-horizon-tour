-- Giờ tập trung riêng cho chuyến (tách khỏi giờ khởi hành xe / giờ cất cánh).
ALTER TABLE "TourDepartureTransport" ADD COLUMN "gatheringTime" TIMESTAMP(3);
