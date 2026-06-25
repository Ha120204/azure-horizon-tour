-- [PHASE 3] Mốc đã gửi email nhắc bổ sung thông tin hành khách (chống spam).
ALTER TABLE "Booking" ADD COLUMN "passengerReminderSentAt" TIMESTAMP(3);
